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
    
    # AI / Model Provider Configurations (Gemini, OpenRouter, OpenAI, Anthropic, Ollama)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "auto")  # "auto", "gemini", "openrouter", "openai", "anthropic", "ollama", "local"
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemma-4-31b-it:free")
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    
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

