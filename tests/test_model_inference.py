"""
PATENT+ LLM Engine, Schema Validation, Evidence Grounding & Multi-Agent Tests
"""

import os
import sys
import json
import asyncio
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.ai.schemas import (
    TechnicalAgentOutput,
    ValuationAgentOutput,
    LegalAgentOutput,
    CriticAgentOutput,
    MultiAgentConsensusOutput,
    OfficeActionResponseDraftOutput,
    GroundedEvidenceRef,
)
from backend.ai.guardrails import (
    extract_json_block,
    repair_json_string,
    safe_parse_and_validate,
    verify_office_action_grounding,
)
from backend.ai.llm_engine import llm_engine
from backend.main import app
from fastapi.testclient import TestClient


class TestModelInferenceAndGuardrails(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_json_extractor_and_repair(self):
        """Verify markdown stripping and trailing comma repair."""
        raw_markdown = """Here is the structured analysis:
```json
{
  "agentName": "01. Technical & Innovation Specialist",
  "technicalScore": 82,
  "technologyRisk": "LOW",
  "productRelevance": 85,
  "citationPercentile": 90,
  "keyFindings": ["Core patent", "High citations",],
  "technicalRationale": "Strong commercial defensibility.",
  "evidence": [],
}
```
Hope this helps!"""

        extracted = extract_json_block(raw_markdown)
        self.assertTrue(extracted.startswith("{") and extracted.endswith("}"))

        validated, err = safe_parse_and_validate(raw_markdown, TechnicalAgentOutput)
        self.assertIsNone(err, f"Validation error: {err}")
        self.assertIsNotNone(validated)
        self.assertEqual(validated.technicalScore, 82)
        self.assertEqual(validated.technologyRisk, "LOW")

    def test_02_malformed_json_returns_controlled_error(self):
        """Verify that malformed JSON is never silently converted into fake data."""
        malformed = "This is not JSON at all."
        validated, err = safe_parse_and_validate(malformed, TechnicalAgentOutput)
        self.assertIsNone(validated)
        self.assertIsNotNone(err)

    def test_03_evidence_grounding_verifier(self):
        """Verify that the grounding guardrail flags hallucinated claims or prior art."""
        context = {
            "applicationNumber": "15/624,192",
            "patentNumber": "US10123456B2",
            "claims": [{"claimNumber": 1}, {"claimNumber": 2}],
            "citedPriorArt": [{"referenceNumber": "US 9,438,682 B1", "inventorOrApplicant": "Srivastava"}],
            "rejectionGrounds": [{"statute": "35 U.S.C. 102"}]
        }

        grounded_draft = """
        IN THE USPTO
        In re Application 15/624,192
        Applicant traverses the rejection of Claim 1 under 35 U.S.C. § 102 over Srivastava (US 9,438,682 B1).
        Claim 1 and Claim 2 are allowable over the cited art.
        """
        res_grounded = verify_office_action_grounding(grounded_draft, context)
        self.assertTrue(res_grounded.isGrounded)
        self.assertGreaterEqual(res_grounded.groundingScore, 0.80)
        self.assertEqual(res_grounded.citedClaimsFound, [1, 2])
        self.assertIn("US 9,438,682 B1", res_grounded.citedReferencesFound)

        # Hallucinated Draft referencing Claim 99 and fictitious statute
        hallucinated_draft = """
        Applicant traverses rejection of Claim 99 under 35 U.S.C. 999 over FictitiousReference.
        """
        res_hallucinated = verify_office_action_grounding(hallucinated_draft, context)
        self.assertFalse(res_hallucinated.isGrounded)
        self.assertLess(res_hallucinated.groundingScore, 0.70)
        self.assertIn("Claim 99", res_hallucinated.unverifiedReferences)

    def test_04_multi_agent_pipeline_execution(self):
        """Verify async execution of the 4 specialist agents and consensus gate."""
        sample_patent = {
            "id": "pat-quantum-1",
            "patentNumber": "US10123456B2",
            "title": "Quantum Error Correction Topology",
            "jurisdiction": "US",
            "applicant": "Rigetti Computing",
            "productRelevance": 88,
            "citationPercentile": 92,
            "businessValueScore": 85,
            "renewalCost": 3200,
            "remainingLifeNormalized": 75,
            "renewalDeadline": "2026-11-15",
            "hasOfficeAction": False,
        }

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        consensus = loop.run_until_complete(llm_engine.execute_multi_agent_pipeline(sample_patent))
        loop.close()

        self.assertIsInstance(consensus, MultiAgentConsensusOutput)
        self.assertGreaterEqual(consensus.compositeScore, 0)
        self.assertLessEqual(consensus.compositeScore, 100)
        self.assertIn("technical", consensus.agents)
        self.assertIn("valuation", consensus.agents)
        self.assertIn("legal", consensus.agents)
        self.assertIn("critic", consensus.agents)
        self.assertIn(consensus.recommendation, ["RENEW", "LAPSE"])

    def test_05_pipeline_status_endpoint(self):
        """Verify GET /api/pipeline/status returns active model and capabilities."""
        res = self.client.get("/api/pipeline/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "OPERATIONAL")
        self.assertIn("activeProvider", data)
        self.assertIn("activeModel", data)
        self.assertIn("freeModelOptions", data)
        self.assertGreaterEqual(len(data["freeModelOptions"]), 3)

    def test_06_pipeline_analyze_endpoint(self):
        """Verify POST /api/pipeline/analyze runs multi-agent evaluation via HTTP."""
        payload = {
            "patentNumber": "US10987654B2",
            "title": "Asynchronous Multi-Path Routing",
            "jurisdiction": "US",
            "applicant": "Cloudflare, Inc.",
            "renewalDeadline": "2026-12-31",
            "renewalCost": 2400,
            "productRelevance": 90,
            "citationPercentile": 80,
            "businessValueScore": 82,
            "remainingLifeNormalized": 70,
            "hasOfficeAction": False
        }
        res = self.client.post("/api/pipeline/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("compositeScore", data)
        self.assertIn("confidenceScore", data)
        self.assertIn("recommendation", data)
        self.assertIn("agents", data)

    def test_07_pipeline_batch_endpoint_with_quarantine(self):
        """Verify POST /api/pipeline/batch isolates invalid inputs and processes valid ones."""
        batch_payload = {
            "batchId": "test-batch-001",
            "patents": [
                {
                    "patentNumber": "US10111111B2",
                    "title": "Valid Patent A",
                    "jurisdiction": "US",
                    "renewalDeadline": "2027-01-01",
                    "renewalCost": 1800,
                    "productRelevance": 75,
                    "citationPercentile": 65
                },
                {
                    "title": "Malformed Patent Missing Number"
                }
            ]
        }
        res = self.client.post("/api/pipeline/batch", json=batch_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["summary"]["totalSubmitted"], 2)
        self.assertEqual(data["summary"]["totalProcessed"], 1)
        self.assertEqual(data["summary"]["totalQuarantined"], 1)
        self.assertEqual(len(data["quarantined"]), 1)
        self.assertEqual(len(data["results"]), 1)
        self.assertIn("durationMs", data["telemetry"])
        self.assertGreaterEqual(data["telemetry"]["durationMs"], 1)
        self.assertEqual(data["telemetry"]["submitted"], 2)
        self.assertEqual(data["telemetry"]["processed"], 1)
        self.assertEqual(data["telemetry"]["quarantined"], 1)
        self.assertIn("averageLatencyPerPatentMs", data["telemetry"])

    def test_08_office_action_generate_endpoint(self):
        """Verify POST /api/office-actions/{id}/generate produces grounded 37 C.F.R. § 1.111 response."""
        res = self.client.get("/api/office-actions")
        self.assertEqual(res.status_code, 200)
        oas = res.json()
        self.assertGreater(len(oas), 0)
        oa_id = oas[0]["id"]

        gen_res = self.client.post(f"/api/office-actions/{oa_id}/generate")
        self.assertEqual(gen_res.status_code, 200)
        gen_data = gen_res.json()
        self.assertEqual(gen_data["status"], "SUCCESS")
        self.assertIn("draft", gen_data)
        self.assertIn("aiResponseDraft", gen_data)
        self.assertIn("provider", gen_data)
        self.assertIn("grounding", gen_data)
        self.assertTrue(gen_data["grounding"]["isGrounded"])
        self.assertIn("RESPONSE UNDER 37 C.F.R. § 1.111", gen_data["draft"])

    def test_09_patent_data_provider_and_prior_art_retrieval(self):
        """Verify real patent data retrieval and Top-K prior art search stage."""
        from backend.providers.patent_data_provider import patent_data_service
        
        # Test 1: Real patent lookup
        pat = asyncio.run(patent_data_service.get_patent("US10123456B2"))
        self.assertIsNotNone(pat)
        self.assertEqual(pat.patentNumber, "US10123456B2")
        self.assertEqual(pat.jurisdiction, "US")
        self.assertTrue(pat.sourceUrl.startswith("https://patents.google.com/patent/US10123456B2"))
        
        # Test 2: Dedicated Prior Art retrieval stage
        prior_art = asyncio.run(patent_data_service.retrieve_prior_art_for_patent({
            "title": "Ultra-low latency edge data aggregation and dispatching architecture",
            "businessValueRationale": "High commercial alignment with core edge routing infrastructure.",
            "jurisdiction": "US"
        }, top_k=3))
        self.assertIsInstance(prior_art, list)
        self.assertGreaterEqual(len(prior_art), 1)
        self.assertGreaterEqual(prior_art[0].similarityScore, 0.60)
        self.assertTrue(prior_art[0].referenceNumber.startswith("US"))

    def test_10_system_status_truthful_reporting(self):
        """Verify GET /api/system/status reports accurate status without fake online AI claims."""
        res = self.client.get("/api/system/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("aiProvider", data)
        self.assertIn("aiStatus", data)
        self.assertIn("aiMode", data)
        self.assertIn("patentProvider", data)
        self.assertIn(data["aiMode"], ["REAL_LLM", "LOCAL_LLM", "DETERMINISTIC_FALLBACK"])
        self.assertIn(data["aiStatus"], ["ONLINE", "NOT CONFIGURED (API KEY MISSING)"])


if __name__ == "__main__":
    unittest.main()
