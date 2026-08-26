"""
PATENT+ End-to-End Backend & Database Integration Test Suite
Validates schema initialization, CRUD operations, decision persistence,
office action generation, health checks, and CORS security.
"""

import os
import sys
import unittest
import uuid
from fastapi.testclient import TestClient

# Ensure root workspace is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.db import init_db, get_db_connection, check_db_health
from backend.providers.seed_generator import seed_database
from backend.config import settings

class TestPatentPlusIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Initialize test database and seed
        init_db()
        seed_database(force=True)
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Verify /api/health returns healthy status and DB connectivity."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "HEALTHY")
        self.assertTrue(data["database"]["connected"])
        self.assertIn("type", data["database"])

    def test_02_dashboard_metrics(self):
        """Verify /api/dashboard returns correct portfolio metrics."""
        response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        stats = data["stats"]
        self.assertEqual(stats["activePatents"], 247)
        self.assertEqual(stats["realPatentsCount"], 10)
        self.assertEqual(stats["syntheticPatentsCount"], 237)
        self.assertIn("jurisdiction", data["breakdowns"])
        self.assertIn("US", data["breakdowns"]["jurisdiction"])

    def test_03_patents_query_and_filtering(self):
        """Verify /api/patents supports search, filtering, and pagination."""
        # 1. Basic listing
        response = self.client.get("/api/patents?limit=10&offset=0")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 247)
        self.assertEqual(len(data["patents"]), 10)

        # 2. Search for real patent
        search_res = self.client.get("/api/patents?search=US10123456B2")
        self.assertEqual(search_res.status_code, 200)
        search_data = search_res.json()
        self.assertEqual(search_data["total"], 1)
        self.assertEqual(search_data["patents"][0]["patentNumber"], "US10123456B2")

        # 3. Flagged only filter
        flagged_res = self.client.get("/api/patents?flagged_only=true")
        self.assertEqual(flagged_res.status_code, 200)
        flagged_data = flagged_res.json()
        self.assertGreater(flagged_data["total"], 0)
        for p in flagged_data["patents"]:
            self.assertTrue(p["isFlagged"] or p["businessValueScore"] < 40)

    def test_04_patent_detail_and_claims(self):
        """Verify /api/patents/{id} retrieves patent with associated claims and office actions."""
        response = self.client.get("/api/patents/US10123456B2")
        self.assertEqual(response.status_code, 200)
        patent = response.json()
        self.assertEqual(patent["patentNumber"], "US10123456B2")
        self.assertTrue(patent["hasOfficeAction"])
        self.assertIn("claims", patent)
        self.assertGreater(len(patent["claims"]), 0)

    def test_05_decision_workflow_and_persistence(self):
        """Verify full RENEW and LAPSE decision lifecycle and persistent DB audit ledger."""
        test_patent_num = "US10123456B2"
        attorney_reason = f"Automated integration test reasoning - {uuid.uuid4().hex[:6]}"

        # 1. Validation test: Invalid decision type
        invalid_res = self.client.post("/api/decisions", json={
            "patentNumber": test_patent_num,
            "decision": "INVALID_ACTION",
            "reasoning": attorney_reason
        })
        self.assertEqual(invalid_res.status_code, 400)

        # 2. Validation test: Empty reasoning
        empty_reason_res = self.client.post("/api/decisions", json={
            "patentNumber": test_patent_num,
            "decision": "RENEW",
            "reasoning": "   "
        })
        self.assertEqual(empty_reason_res.status_code, 400)

        # 3. Commit valid RENEW decision
        renew_res = self.client.post("/api/decisions", json={
            "patentNumber": test_patent_num,
            "decision": "RENEW",
            "reasoning": attorney_reason,
            "actor": "Lead IP Partner"
        })
        self.assertEqual(renew_res.status_code, 200)
        renew_data = renew_res.json()
        self.assertEqual(renew_data["decision"], "RENEW")
        self.assertEqual(renew_data["patentNumber"], test_patent_num)
        self.assertEqual(renew_data["status"], "SUCCESS")

        # 4. Verify decision in decision ledger endpoint
        decisions_res = self.client.get("/api/decisions")
        self.assertEqual(decisions_res.status_code, 200)
        all_decisions = decisions_res.json()
        matching = [d for d in all_decisions if d["reasoning"] == attorney_reason]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]["decision"], "RENEW")

        # 5. Direct database verification
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM decision_log WHERE reasoning = ?;", (attorney_reason,))
            db_row = cursor.fetchone()
            self.assertIsNotNone(db_row)
            self.assertEqual(db_row["patent_number"], test_patent_num)
            self.assertEqual(db_row["decision"], "RENEW")

            # Verify patent table was updated
            cursor.execute("SELECT renewal_status, is_flagged FROM patents WHERE patent_number = ?;", (test_patent_num,))
            pat_row = cursor.fetchone()
            self.assertEqual(pat_row["renewal_status"], "RENEW")
            self.assertEqual(pat_row["is_flagged"], 0)

        # 6. Commit LAPSE decision
        lapse_reason = f"Lapse decision audit test - {uuid.uuid4().hex[:6]}"
        lapse_res = self.client.post("/api/decisions", json={
            "patentNumber": test_patent_num,
            "decision": "LAPSE",
            "reasoning": lapse_reason,
            "actor": "Senior Patent Counsel"
        })
        self.assertEqual(lapse_res.status_code, 200)
        lapse_data = lapse_res.json()
        self.assertEqual(lapse_data["decision"], "LAPSE")

        # Verify patent status updated to LAPSE
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT renewal_status FROM patents WHERE patent_number = ?;", (test_patent_num,))
            pat_row = cursor.fetchone()
            self.assertEqual(pat_row["renewal_status"], "LAPSE")

    def test_06_office_actions_and_generation(self):
        """Verify /api/office-actions and AI response generation."""
        # 1. List office actions
        list_res = self.client.get("/api/office-actions")
        self.assertEqual(list_res.status_code, 200)
        oas = list_res.json()
        self.assertGreater(len(oas), 0)
        oa_id = oas[0]["id"]

        # 2. Get specific office action
        detail_res = self.client.get(f"/api/office-actions/{oa_id}")
        self.assertEqual(detail_res.status_code, 200)
        oa_detail = detail_res.json()
        self.assertIn("rejectionGrounds", oa_detail)
        self.assertIn("citedPriorArt", oa_detail)

        # 3. Generate response draft
        gen_res = self.client.post(f"/api/office-actions/{oa_id}/generate")
        self.assertEqual(gen_res.status_code, 200)
        gen_data = gen_res.json()
        self.assertEqual(gen_data["status"], "SUCCESS")
        self.assertIn("draft", gen_data)
        self.assertTrue(len(gen_data["draft"]) > 100)

    def test_07_cors_and_pna_security(self):
        """Verify CORS preflight and Private Network Access headers."""
        # Preflight from RocketRide domain
        headers = {
            "origin": "https://staging.rocketride.ai",
            "access-control-request-method": "POST",
            "access-control-request-headers": "Content-Type"
        }
        res = self.client.options("/api/decisions", headers=headers)
        self.assertEqual(res.status_code, 204)
        self.assertEqual(res.headers.get("access-control-allow-origin"), "https://staging.rocketride.ai")
        self.assertEqual(res.headers.get("access-control-allow-credentials"), "true")
        self.assertEqual(res.headers.get("access-control-allow-private-network"), "true")

if __name__ == "__main__":
    unittest.main()
