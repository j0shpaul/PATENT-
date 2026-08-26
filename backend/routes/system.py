import logging
from fastapi import APIRouter
from backend.db import get_db_connection
from backend.providers.uspto_provider import uspto_provider
from backend.providers.epo_provider import epo_provider
from backend.providers.seed_generator import seed_database
from backend.ai.rationale_agent import get_ai_provider
from backend.ai.llm_engine import llm_engine
from backend.providers.patent_data_provider import patent_data_service

router = APIRouter(prefix="/api/system", tags=["System"])
logger = logging.getLogger("patent_plus.routes.system")

@router.get("/status", response_model=dict)
async def get_system_status():
    uspto_status = await uspto_provider.check_connection()
    epo_status = await epo_provider.check_connection()
    ai_info = llm_engine.get_active_provider_info()
    is_real = ai_info["mode"] in ("REAL_LLM", "LOCAL_LLM")
    ai_status = "ONLINE" if is_real else "NOT CONFIGURED (API KEY MISSING)"
    ai_display = f"{ai_info['provider'].replace('_', ' ')} ({ai_info['model']})"

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
        "patentProvider": patent_data_service.get_active_provider_name(),
        "ai": ai_display,
        "aiProvider": ai_info["provider"],
        "aiModel": ai_info["model"],
        "aiMode": ai_info["mode"],
        "aiStatus": ai_status,
        "pipeline": "ROCKETRIDE 5-COLUMN WAVE (ACTIVE)",
        "fallback": "DETERMINISTIC RULE ENGINE (AVAILABLE)",
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
