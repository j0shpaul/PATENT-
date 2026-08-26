import logging
from typing import Dict, Any
from backend.ai.llm_engine import llm_engine

logger = logging.getLogger("patent_plus.ai")

class AIProviderInfo:
    def __init__(self, info: Dict[str, str]):
        self._info = info

    def get_provider_name(self) -> str:
        return self._info.get("provider", "GROUNDED_RULE_ENGINE")

    @property
    def provider(self) -> str:
        return self._info.get("provider", "GROUNDED_RULE_ENGINE")

    @property
    def model(self) -> str:
        return self._info.get("model", "rule-grounded-v3")

    @property
    def mode(self) -> str:
        return self._info.get("mode", "GROUNDED_EVIDENCE_ENGINE")

    def __getitem__(self, item):
        return self._info.get(item)

def get_ai_provider() -> AIProviderInfo:
    info = llm_engine.get_active_provider_info()
    return AIProviderInfo(info)

async def generate_patent_rationale(patent_data: Dict[str, Any]) -> Dict[str, Any]:
    return await llm_engine.generate_business_rationale(patent_data)

async def generate_office_action_draft(context: Dict[str, Any]) -> Dict[str, Any]:
    res = await llm_engine.generate_office_action_response(context)
    return res.model_dump()


