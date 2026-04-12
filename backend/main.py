from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
import uvicorn

from app.db.session import get_db
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401 — ensures all models are registered
from app.routers import auth, users, runs, picks, wallet, feed, tournaments, redliners, challenges, teams, streams

app = FastAPI(
    title="Redline API",
    description="Competitive Motorsport Platform — Truth from Results",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",  # Relax for dev; tighten in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(runs.router, prefix="/runs", tags=["runs"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
app.include_router(feed.router, prefix="/feed", tags=["feed"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["tournaments"])
app.include_router(redliners.router, prefix="/redliners", tags=["redliners"])
app.include_router(challenges.router, prefix="/challenges", tags=["challenges"])
app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(streams.router, prefix="/streams", tags=["streams"])


@app.on_event("startup")
def on_startup():
    """Auto-create DB tables on first boot."""
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("✅ Redline DB tables ready")


@app.get("/")
def root():
    return {"message": "Redline API v2 — Truth from Results 🏁"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
