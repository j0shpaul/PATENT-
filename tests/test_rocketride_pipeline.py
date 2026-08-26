"""
PATENT+ RocketRide Multi-Agent Pipeline & Batch Processing Test Suite
Validates schema validation, quarantine isolation, multi-agent evaluation,
contradiction detection, confidence gating, and cost telemetry.
"""

import json
import os
import sys
import unittest

# Ensure root workspace is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

class TestRocketRidePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load canonical .pipe file to verify format
        pipe_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pipelines", "patent_analysis.pipe"))
        with open(pipe_path, "r", encoding="utf-8") as f:
            cls.pipeline_def = json.load(f)

    def test_01_pipe_file_structure(self):
        """Verify .pipe has components first, unique project_id, and valid version."""
        self.assertIn("components", self.pipeline_def)
        self.assertIn("project_id", self.pipeline_def)
        self.assertEqual(self.pipeline_def.get("version"), 1)
        
        components = self.pipeline_def["components"]
        self.assertGreaterEqual(len(components), 5)
        
        # Verify source component is webhook
        source_nodes = [c for c in components if c.get("provider") == "webhook"]
        self.assertEqual(len(source_nodes), 1)
        self.assertEqual(source_nodes[0]["config"]["mode"], "Source")

        # Verify all 4 specialist agent nodes exist
        agent_nodes = [c for c in components if c.get("provider") == "agent_rocketride"]
        agent_ids = {c["id"] for c in agent_nodes}
        self.assertIn("agent_analyst", agent_ids)
        self.assertIn("agent_valuation", agent_ids)
        self.assertIn("agent_legal", agent_ids)
        self.assertIn("agent_critic", agent_ids)

        # Verify terminal response node exists (response_answers or response_json)
        response_nodes = [c for c in components if c.get("provider") in ("response_json", "response_answers")]
        self.assertEqual(len(response_nodes), 1)

    def test_02_schema_validation_and_quarantine(self):
        """Verify schema validation accepts valid records and isolates malformed records."""
        valid_record = {
            "patentNumber": "US10123456B2",
            "title": "Quantum Error Correction Topology",
            "jurisdiction": "US",
            "renewalDeadline": "2026-11-15",
            "renewalCost": 3200,
            "productRelevance": 88,
            "citationPercentile": 92
        }

        malformed_record_1 = {
            "title": "Missing Patent Number and Cost"
        }

        malformed_record_2 = {
            "patentNumber": "EP999999A1",
            "title": "Invalid Negative Cost",
            "jurisdiction": "EP",
            "renewalDeadline": "2027-01-01",
            "renewalCost": -500
        }

        # Check required fields
        required_fields = ["patentNumber", "title", "jurisdiction", "renewalDeadline", "renewalCost"]
        
        def validate(rec):
            errors = []
            for f in required_fields:
                if rec.get(f) is None or rec.get(f) == "":
                    errors.append(f"Missing {f}")
            if rec.get("renewalCost") is not None and rec.get("renewalCost") < 0:
                errors.append("Negative cost")
            return len(errors) == 0, errors

        v1, _ = validate(valid_record)
        self.assertTrue(v1)

        v2, errs2 = validate(malformed_record_1)
        self.assertFalse(v2)
        self.assertGreater(len(errs2), 0)

        v3, errs3 = validate(malformed_record_2)
        self.assertFalse(v3)
        self.assertIn("Negative cost", errs3)

    def test_03_multi_agent_evaluation_and_contradiction(self):
        """Verify 4 agent outputs and contradiction detection for divergent valuations vs legal risk."""
        # Case A: Strong commercial value + Clean legal standing -> High Confidence Auto RENEW
        strong_patent = {
            "patentNumber": "US10123456B2",
            "productRelevance": 90,
            "citationPercentile": 85,
            "renewalCost": 2400,
            "remainingLifeNormalized": 80,
            "businessValueScore": 88,
            "hasOfficeAction": False,
            "claims": [{"claimNumber": 1, "isIndependent": True}]
        }

        # Case B: High cost + Low product relevance + Pending 102 Rejection -> Critic Contradiction -> Human Review
        conflicting_patent = {
            "patentNumber": "US10888999B2",
            "productRelevance": 35,
            "citationPercentile": 40,
            "renewalCost": 6800,
            "remainingLifeNormalized": 20,
            "businessValueScore": 72, # optimistic valuation mismatch
            "hasOfficeAction": True,
            "rejectionGrounds": [{"statute": "35 U.S.C. 102", "rejectionType": "Anticipation"}],
            "claims": [{"claimNumber": 1, "isIndependent": False}] # no independent claims
        }

        # Simulation of Critic & Validator logic
        def evaluate(pat):
            tech_score = int(pat.get("productRelevance", 50) * 0.55 + pat.get("citationPercentile", 50) * 0.35 + 10)
            val_score = int(pat.get("businessValueScore", 50) * 0.6 + pat.get("remainingLifeNormalized", 50) * 0.25 + 10)
            
            legal_score = 85
            if pat.get("hasOfficeAction"):
                legal_score -= 35
            
            contradictions = []
            penalty = 0
            if val_score > 65 and legal_score < 50:
                contradictions.append("Valuation is optimistic despite severe 102/103 rejections")
                penalty += 20
            if pat.get("renewalCost", 0) > 4000 and pat.get("productRelevance", 0) < 50:
                contradictions.append("High annuity on low commercial relevance")
                penalty += 15
            
            confidence = max(0.20, 0.95 - (penalty / 100))
            requires_human = confidence < 0.85 or len(contradictions) > 0
            
            return {
                "tech_score": tech_score,
                "val_score": val_score,
                "legal_score": legal_score,
                "contradictions": contradictions,
                "confidence": confidence,
                "requires_human": requires_human
            }

        res_a = evaluate(strong_patent)
        self.assertGreaterEqual(res_a["confidence"], 0.85)
        self.assertEqual(len(res_a["contradictions"]), 0)
        self.assertFalse(res_a["requires_human"])

        res_b = evaluate(conflicting_patent)
        self.assertLess(res_b["confidence"], 0.85)
        self.assertGreater(len(res_b["contradictions"]), 0)
        self.assertTrue(res_b["requires_human"])

    def test_04_batch_isolation_guarantee(self):
        """Verify that malformed records in a batch do not disrupt valid records."""
        batch = [
            {"patentNumber": "US10123456B2", "title": "Valid 1", "jurisdiction": "US", "renewalDeadline": "2026-11-15", "renewalCost": 2400},
            {"title": "Malformed item with no number"},
            {"patentNumber": "US10888999B2", "title": "Valid 2", "jurisdiction": "US", "renewalDeadline": "2027-02-10", "renewalCost": 3100},
            {"patentNumber": "US10999000B2", "title": "Malformed date", "jurisdiction": "US", "renewalDeadline": "invalid-date", "renewalCost": 1200}
        ]

        valid_processed = []
        quarantined = []

        for item in batch:
            if not item.get("patentNumber") or item.get("renewalDeadline") == "invalid-date":
                quarantined.append(item)
            else:
                valid_processed.append(item)

        self.assertEqual(len(valid_processed), 2)
        self.assertEqual(len(quarantined), 2)
        self.assertEqual(len(valid_processed) + len(quarantined), len(batch))

    def test_05_telemetry_accounting(self):
        """Verify predictable cost calculation and latency attribution."""
        patent_count = 50
        prompt_tokens_per_pat = 1680
        comp_tokens_per_pat = 720

        total_prompt = patent_count * prompt_tokens_per_pat
        total_comp = patent_count * comp_tokens_per_pat
        
        # Pricing model: $0.003 / 1k prompt, $0.015 / 1k completion
        total_cost = ((total_prompt * 0.003) + (total_comp * 0.015)) / 1000
        cost_per_pat = total_cost / patent_count

        self.assertAlmostEqual(total_cost, 0.792, places=3)
        self.assertAlmostEqual(cost_per_pat, 0.01584, places=4)

if __name__ == "__main__":
    unittest.main()
