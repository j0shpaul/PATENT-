import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.db import get_db_connection
from backend.models import DecisionCreateRequest, DecisionLogModel

router = APIRouter(prefix="/api/decisions", tags=["Decisions"])
logger = logging.getLogger("patent_plus.routes.decisions")

@router.get("", response_model=List[Dict[str, Any]])
async def list_decisions():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM decision_log ORDER BY timestamp DESC, id DESC;")
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "patentNumber": r["patent_number"],
                "patentTitle": r["patent_title"],
                "decision": r["decision"],
                "reasoning": r["reasoning"],
                "actor": r["actor"]
            }
            for r in rows
        ]

@router.post("", response_model=Dict[str, Any])
async def create_decision(payload: DecisionCreateRequest):
    # Validation: decision must be RENEW or LAPSE
    decision_clean = payload.decision.upper().strip()
    if decision_clean not in ("RENEW", "LAPSE"):
        raise HTTPException(status_code=400, detail="Decision must be 'RENEW' or 'LAPSE'.")

    # Validation: reasoning must not be empty or whitespace only
    if not payload.reasoning or not payload.reasoning.strip():
        raise HTTPException(status_code=400, detail="Decision reasoning is mandatory and cannot be empty.")

    patent_num = payload.patentNumber.strip()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Find patent title
        cursor.execute("SELECT id, title FROM patents WHERE patent_number = ? OR id = ?;", (patent_num, patent_num))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Patent '{patent_num}' not found.")
        
        patent_id = row["id"]
        patent_title = row["title"]

        # Append-only insert into decision_log
        now_dt = datetime.now()
        formatted_ts = now_dt.strftime("%d %b %Y, %H:%M")
        decision_id = f"dec-{uuid.uuid4().hex[:8]}"
        actor = payload.actor.strip() if payload.actor and payload.actor.strip() else "Attorney"

        cursor.execute("""
        INSERT INTO decision_log (id, timestamp, patent_number, patent_title, decision, reasoning, actor)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (decision_id, formatted_ts, patent_num, patent_title, decision_clean, payload.reasoning.strip(), actor))

        # Update the patent's renewal_status in patents table
        cursor.execute("""
        UPDATE patents 
        SET renewal_status = ?, is_flagged = 0, updated_at = ?
        WHERE id = ?;
        """, (decision_clean, now_dt.isoformat(), patent_id))

        conn.commit()
        logger.info(f"Recorded permanent decision: {decision_clean} for {patent_num} by {actor}")

        return {
            "id": decision_id,
            "timestamp": formatted_ts,
            "patentNumber": patent_num,
            "patentTitle": patent_title,
            "decision": decision_clean,
            "reasoning": payload.reasoning.strip(),
            "actor": actor,
            "status": "SUCCESS"
        }
