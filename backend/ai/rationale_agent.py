import logging
from typing import Dict, Any
from backend.config import settings
from backend.ai.base import BaseAIProvider
from backend.ai.anthropic_provider import AnthropicProvider
from backend.ai.demo_provider import DemoLocalProvider

logger = logging.getLogger("patent_plus.ai")

def get_ai_provider() -> BaseAIProvider:
    if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY.strip()) > 5:
        logger.info("Initializing AnthropicProvider (Claude API Key detected).")
        return AnthropicProvider(api_key=settings.ANTHROPIC_API_KEY)
    else:
        logger.info("Initializing DemoLocalProvider (No Anthropic API Key provided, using deterministic grounded legal AI).")
        return DemoLocalProvider()

async def generate_patent_rationale(patent_data: Dict[str, Any]) -> Dict[str, Any]:
    provider = get_ai_provider()
    try:
        return await provider.generate_business_rationale(patent_data)
    except Exception as e:
        logger.warning(f"Primary AI provider failed: {e}. Falling back to DemoLocalProvider.")
        fallback = DemoLocalProvider()
        return await fallback.generate_business_rationale(patent_data)

async def generate_office_action_draft(context: Dict[str, Any]) -> Dict[str, Any]:
    provider = get_ai_provider()
    try:
        return await provider.generate_office_action_response(context)
    except Exception as e:
        logger.warning(f"Primary AI provider failed for office action: {e}. Falling back to DemoLocalProvider.")
        fallback = DemoLocalProvider()
        return await fallback.generate_office_action_response(context)
