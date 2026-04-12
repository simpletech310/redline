from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.models import Post, User
from app.routers.auth import get_current_user

router = APIRouter()


class CreatePostRequest(BaseModel):
    content: str
    motorsport: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # "image" or "video"


@router.get("")
def get_feed(sport: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Post).options(joinedload(Post.author))
    if sport:
        query = query.filter(Post.motorsport == sport)
    posts = query.order_by(Post.created_at.desc()).limit(50).all()
    return {
        "posts": [
            {
                "id": p.id,
                "author_id": p.author_id,
                "author_username": p.author.username if p.author else "Unknown",
                "author_account_type": str(p.author.account_type.value if hasattr(p.author.account_type, 'value') else p.author.account_type) if p.author else None,
                "content": p.content,
                "motorsport": p.motorsport,
                "media_url": p.media_url,
                "media_type": p.media_type,
                "reaction_counts": p.reaction_counts or {},
                "comment_count": p.comment_count or 0,
                "created_at": p.created_at.isoformat(),
            }
            for p in posts
        ]
    }


@router.post("/posts", status_code=201)
def create_post(data: CreatePostRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only jockeys and team owners can post
    acct_type = current_user.account_type.value if hasattr(current_user.account_type, 'value') else current_user.account_type
    if acct_type not in ["jockey", "team_owner"]:
        raise HTTPException(status_code=403, detail="Only jockeys and team owners can create posts")

    post = Post(
        author_id=current_user.id,
        content=data.content,
        motorsport=data.motorsport,
        media_url=data.media_url,
        media_type=data.media_type,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {
        "id": post.id,
        "content": post.content,
        "media_url": post.media_url,
        "media_type": post.media_type,
    }


class AddReactionRequest(BaseModel):
    reaction: str  # emoji key like "fire", "100", "rage", etc.


@router.post("/posts/{post_id}/react")
def add_reaction(post_id: str, data: AddReactionRequest,
                 current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Add a reaction to a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get current counts or initialize
    counts = post.reaction_counts or {}

    # Increment the reaction count
    reaction_key = data.reaction
    counts[reaction_key] = counts.get(reaction_key, 0) + 1

    post.reaction_counts = counts
    flag_modified(post, "reaction_counts")
    db.commit()

    return {"reaction_counts": post.reaction_counts}
