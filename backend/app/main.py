"""
FastAPI application entry point for the AICTE Complaint Management System backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api import complaints, institutions, notifications, profile, official

settings = get_settings()

app = FastAPI(
    title="AICTE Complaint Management System — API",
    description=(
        "**SIH Prototype** — This is a demonstration system and is not an "
        "official AICTE complaint submission service.\n\n"
        "REST API for the Student Complaint Portal. Handles complaint submission, "
        "AI-powered routing, private tracking, and notifications."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(complaints.router, prefix=API_PREFIX)
app.include_router(institutions.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(official.router, prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "env": settings.app_env,
        "routing_engine": settings.routing_engine,
        "note": "SIH Prototype — not an official AICTE service.",
    }


# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return JSONResponse({
        "service": "AICTE Complaint Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "prototype_notice": "SIH Prototype — demonstration only.",
    })
