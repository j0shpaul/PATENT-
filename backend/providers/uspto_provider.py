import json
import logging
import httpx
from typing import Optional, Dict, Any, List
from backend.config import settings

logger = logging.getLogger("patent_plus.uspto")

class USPTOProvider:
    def __init__(self):
        self.api_key = settings.USPTO_API_KEY
        self.base_url = settings.USPTO_BASE_URL
        self._cached_patents = self._load_cached_patents()
        self._cached_office_actions = self._load_cached_office_actions()

    def _load_cached_patents(self) -> List[Dict[str, Any]]:
        cache_file = settings.DATA_DIR / "cached_real_patents.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    data = json.load(f)
                    return [p for p in data if p.get("jurisdiction") == "US"]
            except Exception as e:
                logger.error(f"Failed to load cached USPTO patents: {e}")
        return []

    def _load_cached_office_actions(self) -> List[Dict[str, Any]]:
        cache_file = settings.DATA_DIR / "real_office_actions.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cached office actions: {e}")
        return []

    async def check_connection(self) -> str:
        """Returns 'LIVE', 'CACHED', or 'UNAVAILABLE'"""
        if not self.api_key:
            return "CACHED"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                headers = {"X-API-KEY": self.api_key, "Accept": "application/json"}
                # Test query to USPTO endpoint
                resp = await client.get(f"{self.base_url}/applications/status", headers=headers)
                if resp.status_code in (200, 401, 403):
                    # 200 is live; 401/403 means host reached but key check
                    return "LIVE" if resp.status_code == 200 else "CACHED"
                return "CACHED"
        except Exception as e:
            logger.warning(f"USPTO live endpoint check failed: {e}. Falling back to CACHED.")
            return "CACHED"

    async def get_patent(self, patent_number: str) -> Optional[Dict[str, Any]]:
        """Fetch patent from live USPTO ODP if key available, else from verified cache."""
        clean_num = patent_number.replace(",", "").replace("-", "").strip()
        
        # Check verified cache first
        for p in self._cached_patents:
            if p["patentNumber"] == clean_num or p["applicationNumber"].replace("/", "").replace(",", "") == clean_num:
                return p

        # If live key is present, attempt live query
        if self.api_key:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    headers = {"X-API-KEY": self.api_key, "Accept": "application/json"}
                    url = f"{self.base_url}/patents/{clean_num}"
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        return self._normalize_uspto_response(data)
            except Exception as e:
                logger.warning(f"Live USPTO query for {patent_number} failed: {e}")

        return None

    def get_all_cached_patents(self) -> List[Dict[str, Any]]:
        return self._cached_patents

    def get_all_cached_office_actions(self) -> List[Dict[str, Any]]:
        return self._cached_office_actions

    def _normalize_uspto_response(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize raw USPTO ODP payload into internal Patent model."""
        return {
            "id": f"pat-live-{raw.get('patentNumber', 'unknown')}",
            "patentNumber": raw.get("patentNumber", ""),
            "applicationNumber": raw.get("applicationNumberText", ""),
            "title": raw.get("inventionTitle", "Untitled Patent"),
            "jurisdiction": "US",
            "applicant": raw.get("firstNamedApplicant", "Unknown Assignee"),
            "filingDate": raw.get("filingDate", "2020-01-01"),
            "grantDate": raw.get("grantDate"),
            "expiryDate": raw.get("grantDate", "2040-01-01"),
            "sourceType": "REAL",
            "sourceProvider": "USPTO_ODP",
            "sourceIdentifier": raw.get("applicationNumberText", ""),
            "retrievalTimestamp": "2026-08-23T12:00:00Z",
            "sourceMetadata": raw
        }

uspto_provider = USPTOProvider()
