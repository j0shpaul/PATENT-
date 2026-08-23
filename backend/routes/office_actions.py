import json
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.db import get_db_connection
from backend.ai.office_action_agent import generate_office_action_draft

router = APIRouter(prefix="/api/office-actions", tags=["Office Actions"])
logger = logging.getLogger("patent_plus.routes.office_actions")

@router.get("", response_model=List[Dict[str, Any]])
async def list_office_actions():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT oa.*, p.title, p.applicant, p.jurisdiction, p.source_type as patent_source_type
        FROM office_actions oa
        JOIN patents p ON oa.patent_id = p.id
        ORDER BY oa.document_date DESC;
        """)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "patentId": r["patent_id"],
                "patentNumber": r["patent_number"],
                "applicationNumber": r["application_number"],
                "title": r["title"],
                "applicant": r["applicant"],
                "jurisdiction": r["jurisdiction"],
                "documentDate": r["document_date"],
                "examinerName": r["examiner_name"],
                "artUnit": r["art_unit"],
                "rejectionType": r["rejection_type"],
                "rejectionSummary": r["rejection_summary"],
                "sourceType": r["source_type"],
                "sourceProvider": r["source_provider"],
                "hasDraft": bool(r["ai_response_draft"]),
                "aiProviderUsed": r["ai_provider_used"],
                "responseDraftedAt": r["response_drafted_at"]
            })
        return result

@router.get("/{id}", response_model=Dict[str, Any])
async def get_office_action(id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT oa.*, p.title, p.applicant, p.jurisdiction, p.filing_date, p.grant_date, p.expiry_date,
               p.source_type as patent_source_type, p.source_provider as patent_source_provider
        FROM office_actions oa
        JOIN patents p ON oa.patent_id = p.id
        WHERE oa.id = ? OR oa.patent_id = ? OR oa.patent_number = ?;
        """, (id, id, id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Office action '{id}' not found.")

        # Get claims
        cursor.execute("SELECT * FROM claims WHERE patent_id = ? ORDER BY claim_number ASC;", (row["patent_id"],))
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

        return {
            "id": row["id"],
            "patentId": row["patent_id"],
            "patentNumber": row["patent_number"],
            "applicationNumber": row["application_number"],
            "title": row["title"],
            "applicant": row["applicant"],
            "jurisdiction": row["jurisdiction"],
            "filingDate": row["filing_date"],
            "grantDate": row["grant_date"],
            "documentDate": row["document_date"],
            "examinerName": row["examiner_name"],
            "artUnit": row["art_unit"],
            "rejectionType": row["rejection_type"],
            "rejectionSummary": row["rejection_summary"],
            "rejectionGrounds": json.loads(row["rejection_grounds_json"]),
            "citedPriorArt": json.loads(row["cited_prior_art_json"]),
            "prosecutionHistory": json.loads(row["prosecution_history_json"]),
            "rawOfficeActionText": row["raw_office_action_text"],
            "sourceType": row["source_type"],
            "sourceProvider": row["source_provider"],
            "sourceIdentifier": row["source_identifier"],
            "retrievalTimestamp": row["retrieval_timestamp"],
            "sourceMetadata": json.loads(row["source_metadata"]) if row["source_metadata"] else {},
            "claims": claims,
            "aiResponseDraft": row["ai_response_draft"],
            "aiProviderUsed": row["ai_provider_used"],
            "responseDraftedAt": row["response_drafted_at"]
        }

@router.post("/{id}/generate", response_model=Dict[str, Any])
async def generate_response(id: str):
    oa = await get_office_action(id)

    # Format claims for AI context
    claims_text = "\n\n".join([
        f"Claim {c['claimNumber']} ({'Independent' if c['isIndependent'] else 'Dependent'} - {c['status']}):\n{c['claimText']}"
        for c in oa.get("claims", [])
    ])

    # Format rejections
    rejections_text = "\n\n".join([
        f"- Statute: {rg['statute']} ({rg['rejectionType']})\n  Claims: {rg['claimsRejected']}\n  Cited Art: {', '.join(rg['citedReferences'])}\n  Examiner Finding: {rg['examinerAnalysis']}"
        for rg in oa.get("rejectionGrounds", [])
    ])

    # Format prior art
    prior_art_text = "\n\n".join([
        f"- {pa['referenceNumber']}: '{pa['title']}' ({pa['inventorOrApplicant']}, {pa['publicationDate']})\n  Relevance: {pa['relevanceSummary']}"
        for pa in oa.get("citedPriorArt", [])
    ])

    # Format prosecution history
    history_text = "\n".join([
        f"- {ev['date']} [{ev['eventCode']}]: {ev['description']}"
        for ev in oa.get("prosecutionHistory", [])
    ])

    context = {
        "patentNumber": oa["patentNumber"],
        "applicationNumber": oa["applicationNumber"],
        "title": oa["title"],
        "applicant": oa["applicant"],
        "examinerName": oa["examinerName"],
        "artUnit": oa["artUnit"],
        "documentDate": oa["documentDate"],
        "rejectionType": oa["rejectionType"],
        "rejectionSummary": oa["rejectionSummary"],
        "rejectionGrounds": oa["rejectionGrounds"],
        "rejectionGroundsText": rejections_text,
        "citedPriorArt": oa["citedPriorArt"],
        "priorArtText": prior_art_text,
        "claims": oa["claims"],
        "claimsText": claims_text,
        "prosecutionHistory": oa["prosecutionHistory"],
        "historyText": history_text
    }

    # Call AI Provider
    result = await generate_office_action_draft(context)
    draft = result["draft"]
    provider = result["provider"]
    now_str = datetime.now().strftime("%d %b %Y, %H:%M")

    # Persist the draft to database
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE office_actions
        SET ai_response_draft = ?, ai_provider_used = ?, response_drafted_at = ?
        WHERE id = ?;
        """, (draft, provider, now_str, oa["id"]))
        conn.commit()

    return {
        "draft": draft,
        "provider": provider,
        "responseDraftedAt": now_str,
        "status": "SUCCESS"
    }
