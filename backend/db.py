import os
import json
import logging
import sqlite3
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from datetime import datetime
from backend.config import settings

logger = logging.getLogger("patent_plus.db")

# Detect database dialect
DATABASE_URL = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""
IS_POSTGRES = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql+psycopg2://")

# Lazy-loaded PostgreSQL pool
_pg_pool = None

def get_pg_pool():
    global _pg_pool
    if _pg_pool is None and IS_POSTGRES:
        try:
            import psycopg2
            from psycopg2 import pool
            # Normalize postgres:// url for psycopg2
            url = DATABASE_URL
            if url.startswith("postgres://"):
                url = "postgresql://" + url[len("postgres://"):]
            elif url.startswith("postgresql+psycopg2://"):
                url = "postgresql://" + url[len("postgresql+psycopg2://"):]
            
            _pg_pool = pool.ThreadedConnectionPool(minconn=1, maxconn=20, dsn=url)
            logger.info("Initialized PostgreSQL connection pool successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
            raise
    return _pg_pool

class DBRow:
    """Wrapper providing dictionary and tuple index access to row columns."""
    def __init__(self, col_names: List[str], values: tuple):
        self._col_names = col_names
        self._values = values
        self._dict = {col: val for col, val in zip(col_names, values)}

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        return self._dict.get(item)

    def get(self, key, default=None):
        return self._dict.get(key, default)

    def keys(self):
        return self._dict.keys()

    def values(self):
        return self._values

    def items(self):
        return self._dict.items()

class WrappedCursor:
    """Unified cursor that translates '?' placeholders to '%s' for PostgreSQL and wraps result rows."""
    def __init__(self, raw_cursor, is_pg: bool):
        self._cursor = raw_cursor
        self._is_pg = is_pg

    def execute(self, query: str, params: Optional[List[Any]] = None):
        if self._is_pg:
            # PostgreSQL requires %s instead of ?
            # Also replace datetime('now') with NOW()
            pg_query = query.replace("?", "%s")
            pg_query = pg_query.replace("datetime('now')", "NOW()")
            if params is not None:
                self._cursor.execute(pg_query, tuple(params))
            else:
                self._cursor.execute(pg_query)
        else:
            if params is not None:
                self._cursor.execute(query, tuple(params))
            else:
                self._cursor.execute(query)
        return self

    def fetchone(self) -> Optional[DBRow]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        if self._is_pg:
            col_names = [desc[0] for desc in self._cursor.description]
            return DBRow(col_names, row)
        col_names = [col[0] for col in self._cursor.description]
        return DBRow(col_names, tuple(row))

    def fetchall(self) -> List[DBRow]:
        rows = self._cursor.fetchall()
        if not rows:
            return []
        if self._is_pg:
            col_names = [desc[0] for desc in self._cursor.description]
            return [DBRow(col_names, r) for r in rows]
        col_names = [col[0] for col in self._cursor.description]
        return [DBRow(col_names, tuple(r)) for r in rows]

class WrappedConnection:
    """Unified connection object."""
    def __init__(self, raw_conn, is_pg: bool, pool_ref=None):
        self._conn = raw_conn
        self._is_pg = is_pg
        self._pool_ref = pool_ref

    def cursor(self) -> WrappedCursor:
        return WrappedCursor(self._conn.cursor(), self._is_pg)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        if self._is_pg and self._pool_ref:
            self._pool_ref.putconn(self._conn)
        else:
            self._conn.close()

@contextmanager
def get_db_connection():
    """Context manager yielding a WrappedConnection."""
    if IS_POSTGRES:
        pool = get_pg_pool()
        raw_conn = pool.getconn()
        wrapped = WrappedConnection(raw_conn, is_pg=True, pool_ref=pool)
        try:
            yield wrapped
        except Exception:
            wrapped.rollback()
            raise
        finally:
            wrapped.close()
    else:
        if settings.is_production:
            raise RuntimeError(
                "CRITICAL: Production environment requires PostgreSQL via DATABASE_URL. "
                "SQLite is disallowed in production."
            )
        raw_conn = sqlite3.connect(str(settings.DB_PATH))
        raw_conn.row_factory = sqlite3.Row
        raw_conn.execute("PRAGMA journal_mode = WAL;")
        raw_conn.execute("PRAGMA foreign_keys = ON;")
        wrapped = WrappedConnection(raw_conn, is_pg=False)
        try:
            yield wrapped
        except Exception:
            wrapped.rollback()
            raise
        finally:
            wrapped.close()

def check_db_health() -> Dict[str, Any]:
    """Check live database connectivity."""
    db_type = "PostgreSQL" if IS_POSTGRES else "SQLite"
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1;")
            res = cursor.fetchone()
            if res and res[0] == 1:
                return {
                    "status": "HEALTHY",
                    "type": db_type,
                    "connected": True,
                    "error": None
                }
            return {
                "status": "UNHEALTHY",
                "type": db_type,
                "connected": False,
                "error": "Query returned unexpected result"
            }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "UNHEALTHY",
            "type": db_type,
            "connected": False,
            "error": str(e)
        }

def init_db():
    """Initialize database with required tables, foreign keys, and indexes."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Patents table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS patents (
            id VARCHAR(100) PRIMARY KEY,
            patent_number VARCHAR(100) UNIQUE NOT NULL,
            application_number VARCHAR(100),
            title TEXT NOT NULL,
            jurisdiction VARCHAR(20) NOT NULL,
            applicant TEXT NOT NULL,
            filing_date VARCHAR(50) NOT NULL,
            grant_date VARCHAR(50),
            expiry_date VARCHAR(50) NOT NULL,
            product_relevance REAL NOT NULL,
            citation_percentile REAL NOT NULL,
            remaining_life_normalized REAL NOT NULL,
            renewal_cost REAL NOT NULL,
            inverse_renewal_cost_percentile REAL NOT NULL,
            business_value_score INTEGER NOT NULL,
            business_value_tier VARCHAR(20) NOT NULL,
            business_value_rationale TEXT NOT NULL,
            renewal_deadline VARCHAR(50) NOT NULL,
            renewal_status VARCHAR(50) NOT NULL,
            is_flagged INTEGER NOT NULL DEFAULT 0,
            source_type VARCHAR(50) NOT NULL,
            source_provider VARCHAR(50) NOT NULL,
            source_identifier VARCHAR(100),
            retrieval_timestamp VARCHAR(100),
            source_metadata TEXT,
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL
        );
        """)
        
        # 2. Claims table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            id VARCHAR(100) PRIMARY KEY,
            patent_id VARCHAR(100) NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
            claim_number INTEGER NOT NULL,
            claim_text TEXT NOT NULL,
            is_independent INTEGER NOT NULL DEFAULT 1,
            claim_type VARCHAR(50) DEFAULT 'System',
            status VARCHAR(50) DEFAULT 'ACTIVE'
        );
        """)
        
        # 3. Office Actions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS office_actions (
            id VARCHAR(100) PRIMARY KEY,
            patent_id VARCHAR(100) NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
            patent_number VARCHAR(100) NOT NULL,
            application_number VARCHAR(100) NOT NULL,
            document_date VARCHAR(50) NOT NULL,
            examiner_name VARCHAR(100) NOT NULL,
            art_unit VARCHAR(50) NOT NULL,
            rejection_type VARCHAR(100) NOT NULL,
            rejection_summary TEXT NOT NULL,
            rejection_grounds_json TEXT NOT NULL,
            cited_prior_art_json TEXT NOT NULL,
            prosecution_history_json TEXT NOT NULL,
            raw_office_action_text TEXT NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            source_provider VARCHAR(50) NOT NULL,
            source_identifier VARCHAR(100),
            retrieval_timestamp VARCHAR(100),
            source_metadata TEXT,
            ai_response_draft TEXT,
            ai_provider_used VARCHAR(50),
            response_drafted_at VARCHAR(100),
            created_at VARCHAR(100),
            updated_at VARCHAR(100)
        );
        """)
        
        # 4. Permanent Decision Log (Append-only)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS decision_log (
            id VARCHAR(100) PRIMARY KEY,
            timestamp VARCHAR(100) NOT NULL,
            patent_number VARCHAR(100) NOT NULL,
            patent_title TEXT NOT NULL,
            decision VARCHAR(50) NOT NULL,
            reasoning TEXT NOT NULL,
            actor VARCHAR(100) NOT NULL DEFAULT 'Attorney'
        );
        """)
        
        # 5. Indexes for fast search & filtering
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_jurisdiction ON patents(jurisdiction);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_status ON patents(renewal_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_score ON patents(business_value_score);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_deadline ON patents(renewal_deadline);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_decision_log_timestamp ON decision_log(timestamp DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_patent_id ON claims(patent_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_oa_patent_id ON office_actions(patent_id);")
        
        conn.commit()
        logger.info(f"Database ({'PostgreSQL' if IS_POSTGRES else 'SQLite'}) initialized successfully.")

def row_to_patent_dict(row: DBRow) -> Dict[str, Any]:
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
        "productRelevance": float(row["product_relevance"]),
        "citationPercentile": float(row["citation_percentile"]),
        "remainingLifeNormalized": float(row["remaining_life_normalized"]),
        "renewalCost": float(row["renewal_cost"]),
        "inverseRenewalCostPercentile": float(row["inverse_renewal_cost_percentile"]),
        "businessValueScore": int(row["business_value_score"]),
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

