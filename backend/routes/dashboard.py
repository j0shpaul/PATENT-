import logging
from fastapi import APIRouter
from backend.db import get_db_connection
from backend.models import DashboardStats
from backend.config import settings
from backend.providers.uspto_provider import uspto_provider
from backend.ai.rationale_agent import get_ai_provider

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
logger = logging.getLogger("patent_plus.routes.dashboard")

@router.get("", response_model=dict)
async def get_dashboard():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Total Active Patents
        cursor.execute("SELECT COUNT(*) FROM patents;")
        total_active = cursor.fetchone()[0]
        
        # 2. Upcoming Deadlines (between 2026-08-23 and 2026-11-23)
        cursor.execute("""
        SELECT COUNT(*) FROM patents 
        WHERE renewal_deadline >= '2026-08-23' AND renewal_deadline <= '2026-11-25';
        """)
        upcoming_deadlines = cursor.fetchone()[0]
        
        # 3. Pending Renewal Decisions (status PENDING)
        cursor.execute("SELECT COUNT(*) FROM patents WHERE renewal_status = 'PENDING';")
        pending_decisions = cursor.fetchone()[0]
        
        # 4. Low-value assets flagged (score < 40 or is_flagged=1)
        cursor.execute("""
        SELECT COUNT(*) FROM patents 
        WHERE business_value_score < 40 OR is_flagged = 1;
        """)
        low_value_flagged = cursor.fetchone()[0]
        
        # 5. Real vs Synthetic
        cursor.execute("SELECT COUNT(*) FROM patents WHERE source_type = 'REAL';")
        real_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM patents WHERE source_type = 'SYNTHETIC';")
        synthetic_count = cursor.fetchone()[0]
        
        # 6. Jurisdiction Breakdown
        cursor.execute("SELECT jurisdiction, COUNT(*) FROM patents GROUP BY jurisdiction;")
        jur_rows = cursor.fetchall()
        jur_breakdown = {row[0]: row[1] for row in jur_rows}
        
        # 7. Tier Breakdown
        cursor.execute("SELECT business_value_tier, COUNT(*) FROM patents GROUP BY business_value_tier;")
        tier_rows = cursor.fetchall()
        tier_breakdown = {row[0]: row[1] for row in tier_rows}
        
        # 8. Status Breakdown
        cursor.execute("SELECT renewal_status, COUNT(*) FROM patents GROUP BY renewal_status;")
        status_rows = cursor.fetchall()
        status_breakdown = {row[0]: row[1] for row in status_rows}
        
        # 9. Recent decisions (last 5)
        cursor.execute("SELECT * FROM decision_log ORDER BY timestamp DESC LIMIT 5;")
        decision_rows = cursor.fetchall()
        recent_decisions = [
            {
                "id": r["id"],
                "timestamp": r["timestamp"],
                "patentNumber": r["patent_number"],
                "patentTitle": r["patent_title"],
                "decision": r["decision"],
                "reasoning": r["reasoning"],
                "actor": r["actor"]
            }
            for r in decision_rows
        ]

    # Data Source Status
    uspto_status = await uspto_provider.check_connection()
    if uspto_status == "LIVE":
        data_source_status = "LIVE DATA"
    elif real_count > 0:
        data_source_status = "CACHED DATA"
    else:
        data_source_status = "DEMO DATA"

    # AI Provider Status
    ai_provider = get_ai_provider()
    provider_name = ai_provider.get_provider_name()
    if provider_name == "OPENROUTER_AI":
        ai_status = f"OPENROUTER ({ai_provider.model})"
    elif provider_name == "OPENAI_AI":
        ai_status = f"OPENAI ({ai_provider.model})"
    elif provider_name == "ANTHROPIC_AI":
        ai_status = f"ANTHROPIC ({ai_provider.model})"
    elif provider_name == "OLLAMA_LOCAL_AI":
        ai_status = f"OLLAMA ({ai_provider.model})"
    else:
        ai_status = "LOCAL GROUNDED AI"

    return {
        "stats": {
            "activePatents": total_active,
            "upcomingDeadlines": upcoming_deadlines,
            "pendingDecisions": pending_decisions,
            "lowValueFlagged": low_value_flagged,
            "realPatentsCount": real_count,
            "syntheticPatentsCount": synthetic_count,
            "dataSourceStatus": data_source_status,
            "aiProviderStatus": ai_status
        },
        "breakdowns": {
            "jurisdiction": jur_breakdown,
            "tiers": tier_breakdown,
            "status": status_breakdown
        },
        "recentDecisions": recent_decisions
    }
