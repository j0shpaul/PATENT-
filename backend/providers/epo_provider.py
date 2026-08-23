import json
import logging
import httpx
from typing import Optional, Dict, Any, List
from backend.config import settings

logger = logging.getLogger("patent_plus.epo")

class EPOProvider:
    def __init__(self):
        self.consumer_key = settings.EPO_CONSUMER_KEY
        self.consumer_secret = settings.EPO_CONSUMER_SECRET
        self.base_url = settings.EPO_OPS_BASE_URL
        self._cached_patents = self._load_cached_patents()
        self._access_token: Optional[str] = None

    def _load_cached_patents(self) -> List[Dict[str, Any]]:
        cache_file = settings.DATA_DIR / "cached_real_patents.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    data = json.load(f)
                    return [p for p in data if p.get("jurisdiction") == "EP"]
            except Exception as e:
                logger.error(f"Failed to load cached EPO patents: {e}")
        return []

    async def check_connection(self) -> str:
        """Returns 'LIVE', 'CACHED', or 'UNAVAILABLE'"""
        if not self.consumer_key or not self.consumer_secret:
            return "CACHED"
        try:
            token = await self._get_access_token()
            return "LIVE" if token else "CACHED"
        except Exception as e:
            logger.warning(f"EPO OPS connection check failed: {e}. Using CACHED.")
            return "CACHED"

    async def _get_access_token(self) -> Optional[str]:
        if not self.consumer_key or not self.consumer_secret:
            return None
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                auth_url = "https://ops.epo.org/3.2/auth/accesstoken.do"
                resp = await client.post(
                    auth_url,
                    auth=(self.consumer_key, self.consumer_secret),
                    data={"grant_type": "client_credentials"},
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    self._access_token = data.get("access_token")
                    return self._access_token
        except Exception as e:
            logger.warning(f"Failed to obtain EPO OAuth2 token: {e}")
        return None

    async def get_patent(self, ep_number: str) -> Optional[Dict[str, Any]]:
        clean_num = ep_number.replace(" ", "").strip()
        
        # Check verified cache first
        for p in self._cached_patents:
            if p["patentNumber"] == clean_num or clean_num in p["patentNumber"]:
                return p

        # If live credentials exist, query EPO OPS
        if self.consumer_key and self.consumer_secret:
            token = await self._get_access_token()
            if token:
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
                        url = f"{self.base_url}/published-data/publication/epodoc/{clean_num}/biblio"
                        resp = await client.get(url, headers=headers)
                        if resp.status_code == 200:
                            return self._normalize_epo_response(resp.json())
                except Exception as e:
                    logger.warning(f"Live EPO OPS query failed for {ep_number}: {e}")

        return None

    def get_all_cached_patents(self) -> List[Dict[str, Any]]:
        return self._cached_patents

    def _normalize_epo_response(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize EPO OPS JSON/XML payload into standard internal model."""
        return {
            "id": f"pat-live-ep-{raw.get('doc_id', 'unknown')}",
            "patentNumber": raw.get("publication_number", "EP-LIVE"),
            "applicationNumber": raw.get("application_number", ""),
            "title": raw.get("title", "European Patent Publication"),
            "jurisdiction": "EP",
            "applicant": raw.get("applicant", "European Assignee"),
            "filingDate": raw.get("filing_date", "2019-01-01"),
            "grantDate": raw.get("grant_date"),
            "expiryDate": "2039-01-01",
            "sourceType": "REAL",
            "sourceProvider": "EPO_OPS",
            "sourceIdentifier": raw.get("publication_number", ""),
            "retrievalTimestamp": "2026-08-23T12:00:00Z",
            "sourceMetadata": raw
        }

epo_provider = EPOProvider()
