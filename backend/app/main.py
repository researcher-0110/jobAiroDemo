from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from app.core.config import settings
from app.api.v1 import jobs, users, recommendations, analytics, admin

app = FastAPI(title="JobAiro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
