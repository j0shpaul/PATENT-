import logging
from typing import Dict, Any
from backend.ai.llm_engine import llm_engine

logger = logging.getLogger("patent_plus.ai.oa_agent")

async def generate_office_action_draft(context: Dict[str, Any]) -> Dict[str, Any]:
    res = await llm_engine.generate_office_action_response(context)
    return res.model_dump()

