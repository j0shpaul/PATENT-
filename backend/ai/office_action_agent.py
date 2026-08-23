import logging
from typing import Dict, Any
from backend.ai.base import BaseAIProvider
from backend.ai.rationale_agent import get_ai_provider
from backend.ai.demo_provider import DemoLocalProvider

logger = logging.getLogger("patent_plus.ai.oa_agent")

async def generate_office_action_draft(context: Dict[str, Any]) -> Dict[str, Any]:
    provider = get_ai_provider()
    try:
        return await provider.generate_office_action_response(context)
    except Exception as e:
        logger.warning(f"Office Action AI generation failed: {e}. Falling back to DemoLocalProvider.")
        fallback = DemoLocalProvider()
        return await fallback.generate_office_action_response(context)
