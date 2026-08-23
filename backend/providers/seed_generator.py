import random
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.config import settings
from backend.db import get_db_connection
from backend.providers.uspto_provider import uspto_provider
from backend.providers.epo_provider import epo_provider

logger = logging.getLogger("patent_plus.seed")

# Deterministic seed for reproducible portfolio generation
RANDOM_SEED = 42

TECH_DOMAINS = [
    ("Edge Computing & Low Latency Architecture", ["Cloudflare, Inc.", "Fastly Inc.", "Akamai Technologies", "Cisco Technology, Inc."]),
    ("Deep Learning Acceleration & Neural Hardware", ["NVIDIA Corporation", "Google LLC", "Qualcomm Technologies", "Intel Corporation"]),
    ("Semiconductor Fabrication & Extreme UV Lithography", ["ASML Netherlands B.V.", "TSMC Ltd.", "Applied Materials", "Lam Research"]),
    ("Biopharmaceutical Antibodies & Conjugates", ["Novartis AG", "Roche Diagnostics", "AstraZeneca AB", "Genentech, Inc."]),
    ("Autonomous Driving Perception & Sensor Fusion", ["Waymo LLC", "Tesla, Inc.", "Cruise LLC", "Mobileye Vision Technologies"]),
    ("Quantum Error Correction & Cryogenic Qubit Control", ["IBM Corporation", "Rigetti Computing", "PsiQuantum Corp", "D-Wave Systems"]),
    ("Next-Gen Lithium-Metal & Solid State Batteries", ["QuantumScape Corporation", "CATL", "LG Energy Solution", "Northvolt AB"]),
    ("Zero-Knowledge Proofs & Scalable Blockchains", ["Blockstream Corporation", "StarkWare Industries", "Matter Labs", "ConsenSys Software"]),
    ("Surgical Robotics & Real-Time Haptic Teleoperation", ["Intuitive Surgical, Inc.", "Medtronic plc", "Johnson & Johnson MedTech", "Stryker Corp"]),
    ("High-Efficiency Video & Audio Codecs", ["Sony Corporation", "Dolby Laboratories", "Apple Inc.", "Fraunhofer IIS"])
]

TITLE_TEMPLATES = [
    "Method and apparatus for {concept} in {domain}",
    "System and architecture for high-throughput {concept}",
    "Adaptive {concept} framework utilizing predictive feedback loops",
    "Scalable {concept} mechanism for distributed enterprise workloads",
    "Hardware-accelerated {concept} with low-overhead memory mapping",
    "Dynamic {concept} management protocol for mission-critical networks",
    "Continuous real-time {concept} monitoring and anomaly mitigation",
    "Fault-tolerant {concept} pipeline with automated failover"
]

CONCEPTS = [
    "payload chunk aggregation", "gradient descent optimization", "laser plasma illumination",
    "monoclonal antibody stabilization", "point cloud spatial segmentation", "qubit pulse sequencing",
    "solid-electrolyte interface passivity", "succinct cryptographic argument", "multi-axis kinematic calibration",
    "transform block partitioning", "heterogeneous thread scheduling", "predictive thermal dissipation",
    "zero-allocation buffer routing", "asynchronous telemetry streaming", "dynamic packet prioritizing"
]

def calculate_business_value_score(
    product_relevance: float,
    citation_percentile: float,
    remaining_life_normalized: float,
    inverse_renewal_cost_percentile: float
) -> int:
    """
    Business Value Score =
    (product_relevance * 0.40) +
    (citation_percentile * 0.25) +
    (remaining_life_normalized * 0.20) +
    (inverse_renewal_cost_percentile * 0.15)
    """
    raw_score = (
        (product_relevance * 0.40) +
        (citation_percentile * 0.25) +
        (remaining_life_normalized * 0.20) +
        (inverse_renewal_cost_percentile * 0.15)
    )
    return max(0, min(100, int(round(raw_score))))

def get_tier(score: int) -> str:
    if score >= 70:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def generate_business_rationale(
    title: str,
    score: int,
    product_relevance: float,
    citation_percentile: float,
    remaining_life_normalized: float,
    renewal_cost: float,
    inverse_renewal_cost_percentile: float
) -> str:
    if score >= 70:
        return (
            f"High-conviction core asset. Strong commercial alignment ({product_relevance:.0f}/100) and superior citation "
            f"ranking ({citation_percentile:.0f}th percentile) provide strategic market protection. Renewal is strongly recommended."
        )
    elif score >= 40:
        return (
            f"Moderate portfolio value. Balanced commercial utility ({product_relevance:.0f}/100) and sustainable maintenance "
            f"fee of ${renewal_cost:,.0f}. Warrants cross-departmental review prior to next renewal window."
        )
    else:
        return (
            f"Why this is flagged: This patent exhibits low commercial product relevance ({product_relevance:.0f}/100), "
            f"depressed citation velocity ({citation_percentile:.0f}th percentile), and an unfavorable cost-efficiency ratio "
            f"(${renewal_cost:,.0f} fee). Immediate review for potential lapse recommended to conserve IP budget."
        )

def seed_database(force: bool = False) -> int:
    """Seeds the SQLite database with exactly 247 patents and office actions."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check current count
        cursor.execute("SELECT COUNT(*) FROM patents;")
        count = cursor.fetchone()[0]
        if count >= 247 and not force:
            logger.info(f"Database already contains {count} patents. Skipping seed.")
            return count

        # If force or incomplete, clean and re-seed
        cursor.execute("DELETE FROM claims;")
        cursor.execute("DELETE FROM office_actions;")
        cursor.execute("DELETE FROM patents;")
        # Note: We preserve decision_log if table exists to remain append-only!

        rnd = random.Random(RANDOM_SEED)
        now = datetime(2026, 8, 23, 14, 30, 0)
        
        # 1. Load Verified Real Patents (10 records)
        real_patents = uspto_provider.get_all_cached_patents() + epo_provider.get_all_cached_patents()
        real_ids = set()
        
        for p in real_patents:
            real_ids.add(p["id"])
            cursor.execute("""
            INSERT INTO patents (
                id, patent_number, application_number, title, jurisdiction, applicant,
                filing_date, grant_date, expiry_date, product_relevance, citation_percentile,
                remaining_life_normalized, renewal_cost, inverse_renewal_cost_percentile,
                business_value_score, business_value_tier, business_value_rationale,
                renewal_deadline, renewal_status, is_flagged, source_type, source_provider,
                source_identifier, retrieval_timestamp, source_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                p["id"], p["patentNumber"], p.get("applicationNumber", ""), p["title"],
                p["jurisdiction"], p["applicant"], p["filingDate"], p.get("grantDate"),
                p["expiryDate"], p["productRelevance"], p["citationPercentile"],
                p["remainingLifeNormalized"], p["renewalCost"], p["inverseRenewalCostPercentile"],
                p["businessValueScore"], p["businessValueTier"], p["businessValueRationale"],
                p["renewalDeadline"], p["renewalStatus"], 1 if p["isFlagged"] else 0,
                p["sourceType"], p["sourceProvider"], p.get("sourceIdentifier"),
                p.get("retrievalTimestamp"), json.dumps(p.get("sourceMetadata", {})),
                now.isoformat(), now.isoformat()
            ))

        # 2. Insert Real Office Actions and Claims
        real_oas = uspto_provider.get_all_cached_office_actions()
        for oa in real_oas:
            cursor.execute("""
            INSERT INTO office_actions (
                id, patent_id, patent_number, application_number, document_date, examiner_name,
                art_unit, rejection_type, rejection_summary, rejection_grounds_json,
                cited_prior_art_json, prosecution_history_json, raw_office_action_text,
                source_type, source_provider, source_identifier, retrieval_timestamp,
                source_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET patent_number=excluded.patent_number;
            """, (
                oa["id"], oa["patentId"], oa["patentNumber"], oa["applicationNumber"],
                oa["documentDate"], oa["examinerName"], oa["artUnit"], oa["rejectionType"],
                oa["rejectionSummary"], json.dumps(oa["rejectionGrounds"]),
                json.dumps(oa["citedPriorArt"]), json.dumps(oa["prosecutionHistory"]),
                oa["rawOfficeActionText"], oa["sourceType"], oa["sourceProvider"],
                oa.get("sourceIdentifier"), oa.get("retrievalTimestamp"),
                json.dumps(oa.get("sourceMetadata", {})),
                now.isoformat(), now.isoformat()
            ))

            # Insert claims for this office action
            for clm in oa.get("claims", []):
                cursor.execute("""
                INSERT INTO claims (
                    id, patent_id, claim_number, claim_text, is_independent, claim_type, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (
                    clm["id"], clm["patentId"], clm["claimNumber"], clm["claimText"],
                    1 if clm.get("isIndependent", True) else 0,
                    clm.get("claimType", "System"), clm.get("status", "ACTIVE")
                ))

        # 3. Generate 237 Synthetic Patents to reach exactly 247
        # We need exact invariants:
        # - Total: 247
        # - Low-value flagged (score < 40): exactly 23
        # - Upcoming deadlines (< 90 days from 2026-08-23, e.g. before 2026-11-23): exactly 12
        # - Pending renewal decisions (status REVIEW/PENDING requiring action): exactly 8
        
        target_total = 247
        target_low_value = 23
        target_upcoming_deadlines = 12
        target_pending_decisions = 8

        num_synthetic = target_total - len(real_patents)  # 237
        
        # Real patents contribute some metrics:
        # Check how many real patents are low-value, upcoming deadlines, or pending:
        # In real patents:
        # - low-value: 0
        # - upcoming deadlines (2026-08-23 to 2026-11-23):
        #   - US10123456B2: 2026-10-30 (1)
        #   - US10234890B2: 2026-09-19 (2)
        # - pending decisions:
        #   - US11234567B2: PENDING (1)
        
        upcoming_needed = target_upcoming_deadlines - 2  # 10 synthetic upcoming deadlines
        pending_needed = target_pending_decisions - 1    # 7 synthetic pending
        low_val_needed = target_low_value                # 23 synthetic low value

        for i in range(1, num_synthetic + 1):
            pat_id = f"pat-synth-{i:03d}"
            
            # Jurisdiction distribution: ~60% US, ~30% EP, ~10% IN
            if i <= 140:
                jur = "US"
                pat_num = f"US{10500000 + i * 137}B2"
                app_num = f"16/{500000 + i * 289:,}".replace(",", "")
            elif i <= 215:
                jur = "EP"
                pat_num = f"EP{3500000 + i * 83}B1"
                app_num = f"EP{1800000 + i * 142}.{i % 9}"
            else:
                jur = "IN"
                pat_num = f"IN{380000 + i * 41}"
                app_num = f"2019/DEL/{1200 + i}"

            domain_name, assignees = rnd.choice(TECH_DOMAINS)
            concept = rnd.choice(CONCEPTS)
            template = rnd.choice(TITLE_TEMPLATES)
            title = template.format(concept=concept, domain=domain_name)
            applicant = rnd.choice(assignees)

            # Dates
            filing_year = rnd.randint(2015, 2021)
            filing_month = rnd.randint(1, 12)
            filing_day = rnd.randint(1, 28)
            filing_date = f"{filing_year:04d}-{filing_month:02d}-{filing_day:02d}"
            
            grant_year = filing_year + rnd.randint(2, 4)
            grant_date = f"{grant_year:04d}-{rnd.randint(1,12):02d}-{rnd.randint(1,28):02d}"
            expiry_date = f"{filing_year + 20:04d}-{filing_month:02d}-{filing_day:02d}"

            # Check if this synthetic record should be low-value flagged
            is_low_value = False
            is_flagged = False
            if low_val_needed > 0 and (i <= 23):
                is_low_value = True
                low_val_needed -= 1

            if is_low_value:
                product_relevance = rnd.uniform(10.0, 32.0)
                citation_percentile = rnd.uniform(15.0, 42.0)
                remaining_life_norm = rnd.uniform(20.0, 48.0)
                renewal_cost = rnd.choice([3700.0, 4200.0, 7400.0, 8100.0])
                inverse_cost_perc = rnd.uniform(18.0, 35.0)
                is_flagged = True
            else:
                # Moderate to high value
                product_relevance = rnd.uniform(55.0, 98.0)
                citation_percentile = rnd.uniform(60.0, 97.0)
                remaining_life_norm = rnd.uniform(45.0, 90.0)
                renewal_cost = rnd.choice([1200.0, 2000.0, 2400.0, 3700.0])
                inverse_cost_perc = rnd.uniform(65.0, 95.0)
                is_flagged = False
                
            # Check status
            if is_low_value:
                status = "REVIEW"
            elif pending_needed > 0:
                status = "PENDING"
                pending_needed -= 1
            elif i % 4 == 0:
                status = "REVIEW"
            else:
                status = "RENEW"

            score = calculate_business_value_score(
                product_relevance, citation_percentile, remaining_life_norm, inverse_cost_perc
            )
            tier = get_tier(score)
            rationale = generate_business_rationale(
                title, score, product_relevance, citation_percentile, remaining_life_norm, renewal_cost, inverse_cost_perc
            )

            # Assign deadline
            if upcoming_needed > 0 and i in [1, 2, 3, 4, 5, 24, 25, 26, 27, 28]:
                # Between 2026-08-25 and 2026-11-20
                days_ahead = rnd.randint(5, 88)
                deadline_dt = now + timedelta(days=days_ahead)
                renewal_deadline = deadline_dt.strftime("%Y-%m-%d")
                upcoming_needed -= 1
            else:
                # Further out (2027-2030)
                days_ahead = rnd.randint(120, 1400)
                deadline_dt = now + timedelta(days=days_ahead)
                renewal_deadline = deadline_dt.strftime("%Y-%m-%d")

            cursor.execute("""
            INSERT INTO patents (
                id, patent_number, application_number, title, jurisdiction, applicant,
                filing_date, grant_date, expiry_date, product_relevance, citation_percentile,
                remaining_life_normalized, renewal_cost, inverse_renewal_cost_percentile,
                business_value_score, business_value_tier, business_value_rationale,
                renewal_deadline, renewal_status, is_flagged, source_type, source_provider,
                source_identifier, retrieval_timestamp, source_metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                pat_id, pat_num, app_num, title, jur, applicant,
                filing_date, grant_date, expiry_date,
                round(product_relevance, 1), round(citation_percentile, 1),
                round(remaining_life_norm, 1), renewal_cost, round(inverse_cost_perc, 1),
                score, tier, rationale, renewal_deadline, status,
                1 if is_flagged else 0, "SYNTHETIC", "SYNTHETIC_GENERATOR",
                pat_num, now.isoformat(), json.dumps({"domain": domain_name}),
                now.isoformat(), now.isoformat()
            ))

        conn.commit()
        
        # Verify counts
        cursor.execute("SELECT COUNT(*) FROM patents;")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM patents WHERE is_flagged = 1;")
        flagged = cursor.fetchone()[0]
        
        logger.info(f"Database seeded successfully. Total patents: {total}, Low-value flagged: {flagged}")
        return total
