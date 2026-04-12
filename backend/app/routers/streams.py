import os
import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models import LiveStream, User, Run
from app.routers.auth import get_current_user

router = APIRouter()

# Mux API credentials (set via environment variables)
MUX_TOKEN_ID = os.getenv("MUX_TOKEN_ID", "")
MUX_TOKEN_SECRET = os.getenv("MUX_TOKEN_SECRET", "")
MUX_API_URL = "https://api.mux.com"


def mux_request(method: str, path: str, json_data: dict = None):
    """Make authenticated request to Mux API."""
    if not MUX_TOKEN_ID or not MUX_TOKEN_SECRET:
        raise HTTPException(status_code=500, detail="Mux credentials not configured")

    with httpx.Client() as client:
        response = client.request(
            method,
            f"{MUX_API_URL}{path}",
            auth=(MUX_TOKEN_ID, MUX_TOKEN_SECRET),
            json=json_data,
            timeout=30.0,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=f"Mux API error: {response.text}")
        return response.json()


class CreateStreamRequest(BaseModel):
    title: str
    description: Optional[str] = None
    motorsport: Optional[str] = None
    run_id: Optional[str] = None


@router.get("")
def list_streams(
    status: Optional[str] = None,
    motorsport: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all streams, optionally filtered by status or motorsport."""
    query = db.query(LiveStream)
    if status:
        query = query.filter(LiveStream.status == status)
    if motorsport:
        query = query.filter(LiveStream.motorsport == motorsport)
    streams = query.order_by(LiveStream.created_at.desc()).limit(50).all()

    return {
        "streams": [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "motorsport": s.motorsport,
                "creator_id": s.creator_id,
                "creator_username": s.creator.username if s.creator else None,
                "run_id": s.run_id,
                "status": s.status,
                "viewer_count": s.viewer_count,
                "playback_id": s.mux_playback_id,
                "thumbnail_url": s.thumbnail_url,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "created_at": s.created_at.isoformat(),
            }
            for s in streams
        ]
    }


@router.get("/live")
def list_live_streams(motorsport: Optional[str] = None, db: Session = Depends(get_db)):
    """Get currently active streams."""
    query = db.query(LiveStream).filter(LiveStream.status == "active")
    if motorsport:
        query = query.filter(LiveStream.motorsport == motorsport)
    streams = query.order_by(LiveStream.viewer_count.desc()).all()

    return {
        "streams": [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "motorsport": s.motorsport,
                "creator_username": s.creator.username if s.creator else None,
                "run_id": s.run_id,
                "viewer_count": s.viewer_count,
                "playback_id": s.mux_playback_id,
                "thumbnail_url": f"https://image.mux.com/{s.mux_playback_id}/thumbnail.jpg" if s.mux_playback_id else None,
                "started_at": s.started_at.isoformat() if s.started_at else None,
            }
            for s in streams
        ]
    }


@router.get("/{stream_id}")
def get_stream(stream_id: str, db: Session = Depends(get_db)):
    """Get stream details including playback URL."""
    stream = db.query(LiveStream).filter(LiveStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    return {
        "id": stream.id,
        "title": stream.title,
        "description": stream.description,
        "motorsport": stream.motorsport,
        "creator_id": stream.creator_id,
        "creator_username": stream.creator.username if stream.creator else None,
        "run_id": stream.run_id,
        "status": stream.status,
        "viewer_count": stream.viewer_count,
        "playback_id": stream.mux_playback_id,
        "playback_url": f"https://stream.mux.com/{stream.mux_playback_id}.m3u8" if stream.mux_playback_id else None,
        "thumbnail_url": f"https://image.mux.com/{stream.mux_playback_id}/thumbnail.jpg" if stream.mux_playback_id else None,
        "started_at": stream.started_at.isoformat() if stream.started_at else None,
        "ended_at": stream.ended_at.isoformat() if stream.ended_at else None,
        "created_at": stream.created_at.isoformat(),
    }


@router.post("", status_code=201)
def create_stream(
    data: CreateStreamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new live stream (team owners only)."""
    acct_type = current_user.account_type.value if hasattr(current_user.account_type, 'value') else current_user.account_type
    if acct_type != "team_owner":
        raise HTTPException(status_code=403, detail="Only team owners can create streams")

    # Verify run exists if provided
    if data.run_id:
        run = db.query(Run).filter(Run.id == data.run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

    # Create Mux live stream
    mux_response = mux_request("POST", "/video/v1/live-streams", {
        "playback_policy": ["public"],
        "new_asset_settings": {"playback_policy": ["public"]},
        "reduced_latency": True,
    })

    mux_data = mux_response.get("data", {})

    stream = LiveStream(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        motorsport=data.motorsport,
        run_id=data.run_id,
        mux_live_stream_id=mux_data.get("id"),
        mux_stream_key=mux_data.get("stream_key"),
        mux_playback_id=mux_data.get("playback_ids", [{}])[0].get("id") if mux_data.get("playback_ids") else None,
        status="idle",
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)

    return {
        "id": stream.id,
        "title": stream.title,
        "stream_key": stream.mux_stream_key,  # Only returned to creator
        "rtmp_url": "rtmps://global-live.mux.com:443/app",
        "playback_id": stream.mux_playback_id,
        "status": stream.status,
    }


@router.get("/{stream_id}/key")
def get_stream_key(
    stream_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get stream key (creator only)."""
    stream = db.query(LiveStream).filter(LiveStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can access stream key")

    return {
        "stream_key": stream.mux_stream_key,
        "rtmp_url": "rtmps://global-live.mux.com:443/app",
    }


@router.post("/{stream_id}/start")
def start_stream(
    stream_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark stream as active (called when broadcast starts)."""
    stream = db.query(LiveStream).filter(LiveStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can start stream")

    stream.status = "active"
    stream.started_at = datetime.utcnow()
    db.commit()

    return {"status": "active", "started_at": stream.started_at.isoformat()}


@router.post("/{stream_id}/end")
def end_stream(
    stream_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End the live stream."""
    stream = db.query(LiveStream).filter(LiveStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can end stream")

    # Disable the Mux live stream
    if stream.mux_live_stream_id:
        try:
            mux_request("PUT", f"/video/v1/live-streams/{stream.mux_live_stream_id}/disable")
        except Exception:
            pass  # Best effort

    stream.status = "ended"
    stream.ended_at = datetime.utcnow()
    db.commit()

    return {"status": "ended", "ended_at": stream.ended_at.isoformat()}


@router.post("/{stream_id}/viewer-ping")
def viewer_ping(stream_id: str, db: Session = Depends(get_db)):
    """Ping to track viewer count (anonymous endpoint)."""
    stream = db.query(LiveStream).filter(LiveStream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    # Simple increment for now (in production, use Redis for accurate count)
    stream.viewer_count = (stream.viewer_count or 0) + 1
    db.commit()

    return {"viewer_count": stream.viewer_count}


@router.get("/my/streams")
def get_my_streams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get streams created by current user."""
    streams = (
        db.query(LiveStream)
        .filter(LiveStream.creator_id == current_user.id)
        .order_by(LiveStream.created_at.desc())
        .all()
    )

    return {
        "streams": [
            {
                "id": s.id,
                "title": s.title,
                "motorsport": s.motorsport,
                "status": s.status,
                "viewer_count": s.viewer_count,
                "playback_id": s.mux_playback_id,
                "created_at": s.created_at.isoformat(),
            }
            for s in streams
        ]
    }
