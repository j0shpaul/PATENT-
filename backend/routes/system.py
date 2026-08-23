import logging
from fastapi import APIRouter
from backend.db import get_db_connection
from backend.providers.uspto_provider import uspto_provider
from backend.providers.epo_provider import epo_provider
from backend.providers.seed_generator import seed_database
from backend.ai.rationale_agent import get_ai_provider

router = APIRouter(prefix="/api/system", tags=["System"])
logger = logging.getLogger("patent_plus.routes.system")

@router.get("/status", response_model=dict)
async def get_system_status():
    uspto_status = await uspto_provider.check_connection()
    epo_status = await epo_provider.check_connection()
    ai_provider = get_ai_provider()
    ai_status = "ANTHROPIC AI" if ai_provider.get_provider_name() == "ANTHROPIC_AI" else "LOCAL DEMO AI"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM patents;")
        total_patents = cursor.fetchone()[0]
        cursor.execute("SELECT source_provider, COUNT(*) FROM patents GROUP BY source_provider;")
        source_rows = cursor.fetchall()
        source_breakdown = {r[0]: r[1] for r in source_rows}
        cursor.execute("SELECT COUNT(*) FROM decision_log;")
        total_decisions = cursor.fetchone()[0]

    return {
        "uspto": uspto_status,
        "epo": epo_status,
        "ai": ai_status,
        "database": "CONNECTED",
        "activePatentsTotal": total_patents,
        "totalDecisionsLogged": total_decisions,
        "sourceBreakdown": source_breakdown
    }

@router.post("/reset-demo", response_model=dict)
async def reset_demo_dataset():
    total = seed_database(force=True)
    return {
        "status": "SUCCESS",
        "message": f"Database freshly seeded with {total} patents.",
        "activePatents": total
    }
