import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.db import init_db
from backend.providers.seed_generator import seed_database
from backend.routes.dashboard import router as dashboard_router
from backend.routes.patents import router as patents_router
from backend.routes.decisions import router as decisions_router
from backend.routes.office_actions import router as office_actions_router
from backend.routes.system import router as system_router

# Configure clean logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("patent_plus.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed if empty
    logger.info("Starting PATENT+ Backend...")
    init_db()
    total_seeded = seed_database(force=False)
    logger.info(f"PATENT+ Ready. Total portfolio assets: {total_seeded}")
    yield
    logger.info("Shutting down PATENT+ Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise legal-tech decision platform for in-house IP attorneys.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(dashboard_router)
app.include_router(patents_router)
app.include_router(decisions_router)
app.include_router(office_actions_router)
app.include_router(system_router)

@app.get("/")
async def root():
    return {
        "platform": "PATENT+",
        "tagline": "portfolio intelligence",
        "status": "operational",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
