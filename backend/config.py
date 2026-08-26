import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root if present
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

class Settings:
    PROJECT_NAME: str = "PATENT+"
    PROJECT_SUBTITLE: str = "portfolio intelligence"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # API Keys & Endpoints
    USPTO_API_KEY: str = os.getenv("USPTO_API_KEY", "")
    EPO_CONSUMER_KEY: str = os.getenv("EPO_CONSUMER_KEY", "")
    EPO_CONSUMER_SECRET: str = os.getenv("EPO_CONSUMER_SECRET", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    USPTO_BASE_URL: str = "https://api.uspto.gov/api/v1/patent"
    EPO_OPS_BASE_URL: str = "https://ops.epo.org/3.2/rest-services"
    
    # Database Configuration (PostgreSQL in production, SQLite fallback in development)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DB_PATH: Path = PROJECT_ROOT / "patent_plus.db"
    DATA_DIR: Path = Path(__file__).resolve().parent / "data"
    
    # Server & CORS
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

settings = Settings()

