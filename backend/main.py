import logging
import re
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from backend.config import settings
from backend.db import init_db, check_db_health
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

def parse_cors_origins() -> list:
    """Parse configured CORS origins from environment."""
    origins = []
    if settings.CORS_ORIGINS:
        origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    return origins

def is_origin_allowed(origin: str, allowed_origins: list) -> bool:
    """Validate if request origin is authorized."""
    if not origin:
        return True
    
    # 1. Exact match against configured CORS_ORIGINS
    if origin in allowed_origins or "*" in allowed_origins:
        return True
        
    # 2. RocketRide platform subdomains (*.rocketride.ai)
    if re.match(r"^https://([a-zA-Z0-9-]+\.)*rocketride\.ai(:\d+)?$", origin):
        return True
        
    # 3. Development local origins (only allowed in development mode)
    if not settings.is_production:
        if re.match(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
            return True

    return False

class ProductionCORSMiddleware(BaseHTTPMiddleware):
    """Production CORS & Private Network Access (PNA) security middleware."""
    def __init__(self, app):
        super().__init__(app)
        self.allowed_origins = parse_cors_origins()

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        allowed = is_origin_allowed(origin, self.allowed_origins)
        allow_origin_header = origin if (origin and allowed) else (self.allowed_origins[0] if self.allowed_origins else "")

        if request.method == "OPTIONS":
            response = Response(status_code=204 if allowed else 403)
            if allowed and origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
                response.headers["Access-Control-Allow-Headers"] = request.headers.get(
                    "access-control-request-headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With"
                )
                response.headers["Access-Control-Allow-Private-Network"] = "true"
                response.headers["Access-Control-Max-Age"] = "86400"
            return response
        
        response = await call_next(request)
        if allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed if empty
    logger.info(f"Starting PATENT+ Backend ({settings.ENVIRONMENT} mode)...")
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

# Enable CORS & PNA middleware
app.add_middleware(ProductionCORSMiddleware)

# Register API routes
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
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check():
    db_health = check_db_health()
    is_healthy = db_health.get("connected", False)
    return {
        "status": "HEALTHY" if is_healthy else "UNHEALTHY",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now().isoformat(),
        "database": db_health
    }

if __name__ == "__main__":
    import uvicorn
    reload_mode = not settings.is_production
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=reload_mode)

