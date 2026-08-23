from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAIProvider(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns provider identifier: 'ANTHROPIC_AI' or 'LOCAL_DEMO_AI'"""
        pass

    @abstractmethod
    async def generate_business_rationale(self, patent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generates plain-English business score explanation."""
        pass

    @abstractmethod
    async def generate_office_action_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generates grounded first-pass Office Action response for attorney review."""
        pass
