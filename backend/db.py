import sqlite3
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.config import settings

logger = logging.getLogger("patent_plus.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH))
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high performance concurrency
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initialize SQLite database with required tables and indexes."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Patents table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS patents (
            id TEXT PRIMARY KEY,
            patent_number TEXT UNIQUE NOT NULL,
            application_number TEXT,
            title TEXT NOT NULL,
            jurisdiction TEXT NOT NULL,
            applicant TEXT NOT NULL,
            filing_date TEXT NOT NULL,
            grant_date TEXT,
            expiry_date TEXT NOT NULL,
            product_relevance REAL NOT NULL,
            citation_percentile REAL NOT NULL,
            remaining_life_normalized REAL NOT NULL,
            renewal_cost REAL NOT NULL,
            inverse_renewal_cost_percentile REAL NOT NULL,
            business_value_score INTEGER NOT NULL,
            business_value_tier TEXT NOT NULL,
            business_value_rationale TEXT NOT NULL,
            renewal_deadline TEXT NOT NULL,
            renewal_status TEXT NOT NULL,
            is_flagged INTEGER NOT NULL DEFAULT 0,
            source_type TEXT NOT NULL,
            source_provider TEXT NOT NULL,
            source_identifier TEXT,
            retrieval_timestamp TEXT,
            source_metadata TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)
        
        # Claims table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            id TEXT PRIMARY KEY,
            patent_id TEXT NOT NULL,
            claim_number INTEGER NOT NULL,
            claim_text TEXT NOT NULL,
            is_independent INTEGER NOT NULL DEFAULT 1,
            claim_type TEXT DEFAULT 'System',
            status TEXT DEFAULT 'ACTIVE',
            FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
        );
        """)
        
        # Office Actions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS office_actions (
            id TEXT PRIMARY KEY,
            patent_id TEXT NOT NULL,
            patent_number TEXT NOT NULL,
            application_number TEXT NOT NULL,
            document_date TEXT NOT NULL,
            examiner_name TEXT NOT NULL,
            art_unit TEXT NOT NULL,
            rejection_type TEXT NOT NULL,
            rejection_summary TEXT NOT NULL,
            rejection_grounds_json TEXT NOT NULL,
            cited_prior_art_json TEXT NOT NULL,
            prosecution_history_json TEXT NOT NULL,
            raw_office_action_text TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_provider TEXT NOT NULL,
            source_identifier TEXT,
            retrieval_timestamp TEXT,
            source_metadata TEXT,
            ai_response_draft TEXT,
            ai_provider_used TEXT,
            response_drafted_at TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (patent_id) REFERENCES patents(id) ON DELETE CASCADE
        );
        """)
        
        # Permanent Decision Log (Append-only)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS decision_log (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            patent_number TEXT NOT NULL,
            patent_title TEXT NOT NULL,
            decision TEXT NOT NULL,
            reasoning TEXT NOT NULL,
            actor TEXT NOT NULL DEFAULT 'Attorney'
        );
        """)
        
        # Indexes for fast search & filtering
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_jurisdiction ON patents(jurisdiction);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_status ON patents(renewal_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_score ON patents(business_value_score);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_deadline ON patents(renewal_deadline);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_decision_log_timestamp ON decision_log(timestamp DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_patent_id ON claims(patent_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_oa_patent_id ON office_actions(patent_id);")
        
        conn.commit()
        logger.info("Database initialized successfully.")

def row_to_patent_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "patentNumber": row["patent_number"],
        "applicationNumber": row["application_number"] or "",
        "title": row["title"],
        "jurisdiction": row["jurisdiction"],
        "applicant": row["applicant"],
        "filingDate": row["filing_date"],
        "grantDate": row["grant_date"],
        "expiryDate": row["expiry_date"],
        "productRelevance": row["product_relevance"],
        "citationPercentile": row["citation_percentile"],
        "remainingLifeNormalized": row["remaining_life_normalized"],
        "renewalCost": row["renewal_cost"],
        "inverseRenewalCostPercentile": row["inverse_renewal_cost_percentile"],
        "businessValueScore": row["business_value_score"],
        "businessValueTier": row["business_value_tier"],
        "businessValueRationale": row["business_value_rationale"],
        "renewalDeadline": row["renewal_deadline"],
        "renewalStatus": row["renewal_status"],
        "isFlagged": bool(row["is_flagged"]),
        "sourceType": row["source_type"],
        "sourceProvider": row["source_provider"],
        "sourceIdentifier": row["source_identifier"],
        "retrievalTimestamp": row["retrieval_timestamp"],
        "sourceMetadata": json.loads(row["source_metadata"]) if row["source_metadata"] else {},
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }
