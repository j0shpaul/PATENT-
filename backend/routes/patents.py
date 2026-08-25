import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from backend.db import get_db_connection, row_to_patent_dict
from backend.models import PatentModel
from backend.ai.rationale_agent import generate_patent_rationale

router = APIRouter(prefix="/api/patents", tags=["Patents"])
logger = logging.getLogger("patent_plus.routes.patents")

@router.get("", response_model=Dict[str, Any])
async def list_patents(
    search: Optional[str] = Query(None, description="Search patent number, title, or assignee"),
    jurisdiction: Optional[str] = Query(None, description="US, EP, IN, or all"),
    status: Optional[str] = Query(None, description="REVIEW, RENEW, LAPSE, PENDING, or all"),
    tier: Optional[str] = Query(None, description="HIGH, MEDIUM, LOW, or all"),
    source: Optional[str] = Query(None, description="REAL, SYNTHETIC, or all"),
    flagged_only: Optional[bool] = Query(False, description="Filter only flagged low-value patents"),
    sort_by: Optional[str] = Query("score", description="score, deadline, cost, patentNumber"),
    sort_order: Optional[str] = Query("desc", description="asc or desc"),
    limit: int = Query(250, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    query = "SELECT * FROM patents WHERE 1=1"
    params: List[Any] = []

    if search and search.strip():
        term = f"%{search.strip()}%"
        query += " AND (patent_number LIKE ? OR title LIKE ? OR applicant LIKE ? OR application_number LIKE ?)"
        params.extend([term, term, term, term])

    if jurisdiction and jurisdiction.upper() != "ALL":
        query += " AND jurisdiction = ?"
        params.append(jurisdiction.upper())

    if status and status.upper() != "ALL":
        query += " AND renewal_status = ?"
        params.append(status.upper())

    if tier and tier.upper() != "ALL":
        query += " AND business_value_tier = ?"
        params.append(tier.upper())

    if source and source.upper() != "ALL":
        query += " AND source_type = ?"
        params.append(source.upper())

    if flagged_only:
        query += " AND (is_flagged = 1 OR business_value_score < 40)"

    # Sorting with deterministic secondary sort key
    sort_map = {
        "score": "business_value_score",
        "deadline": "renewal_deadline",
        "cost": "renewal_cost",
        "patentNumber": "patent_number"
    }
    col = sort_map.get(sort_by, "business_value_score")
    order = "ASC" if sort_order.lower() == "asc" else "DESC"
    query += f" ORDER BY {col} {order}, patent_number ASC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        patents = [row_to_patent_dict(r) for r in rows]

        # Total matching count
        count_query = "SELECT COUNT(*) FROM patents WHERE 1=1"
        count_params = params[:-2]
        # Reconstruct where clauses
        if search and search.strip():
            count_query += " AND (patent_number LIKE ? OR title LIKE ? OR applicant LIKE ? OR application_number LIKE ?)"
        if jurisdiction and jurisdiction.upper() != "ALL":
            count_query += " AND jurisdiction = ?"
        if status and status.upper() != "ALL":
            count_query += " AND renewal_status = ?"
        if tier and tier.upper() != "ALL":
            count_query += " AND business_value_tier = ?"
        if source and source.upper() != "ALL":
            count_query += " AND source_type = ?"
        if flagged_only:
            count_query += " AND (is_flagged = 1 OR business_value_score < 40)"
        
        cursor.execute(count_query, count_params)
        total_matching = cursor.fetchone()[0]

    return {
        "total": total_matching,
        "limit": limit,
        "offset": offset,
        "patents": patents
    }

@router.get("/{id_or_number}", response_model=Dict[str, Any])
async def get_patent(id_or_number: str):
    clean = id_or_number.replace(",", "").replace("-", "").strip()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM patents WHERE id = ? OR patent_number = ? OR application_number = ?;
        """, (id_or_number, clean, clean))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Patent '{id_or_number}' not found.")

        patent = row_to_patent_dict(row)

        # Retrieve related claims if any
        cursor.execute("SELECT * FROM claims WHERE patent_id = ? ORDER BY claim_number ASC;", (patent["id"],))
        claim_rows = cursor.fetchall()
        claims = [
            {
                "id": c["id"],
                "claimNumber": c["claim_number"],
                "claimText": c["claim_text"],
                "isIndependent": bool(c["is_independent"]),
                "claimType": c["claim_type"],
                "status": c["status"]
            }
            for c in claim_rows
        ]
        patent["claims"] = claims

        # Check if there is an office action
        cursor.execute("SELECT id, document_date, rejection_type FROM office_actions WHERE patent_id = ?;", (patent["id"],))
        oa_row = cursor.fetchone()
        patent["hasOfficeAction"] = bool(oa_row)
        if oa_row:
            patent["officeActionId"] = oa_row["id"]
            patent["officeActionDate"] = oa_row["document_date"]

        # Check decision log for this patent
        cursor.execute("SELECT * FROM decision_log WHERE patent_number = ? ORDER BY timestamp DESC;", (patent["patentNumber"],))
        decision_rows = cursor.fetchall()
        patent["decisions"] = [
            {
                "id": d["id"],
                "timestamp": d["timestamp"],
                "decision": d["decision"],
                "reasoning": d["reasoning"],
                "actor": d["actor"]
            }
            for d in decision_rows
        ]

    return patent

@router.post("/{id_or_number}/recalculate-rationale", response_model=Dict[str, Any])
async def recalculate_rationale(id_or_number: str):
    patent = await get_patent(id_or_number)
    ai_result = await generate_patent_rationale(patent)
    new_rationale = ai_result["rationale"]
    provider_used = ai_result["provider"]

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE patents SET business_value_rationale = ?, updated_at = datetime('now')
        WHERE id = ?;
        """, (new_rationale, patent["id"]))
        conn.commit()

    patent["businessValueRationale"] = new_rationale
    patent["aiProviderUsed"] = provider_used
    return patent
