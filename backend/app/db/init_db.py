"""
Database initialization script — creates all tables.
Run once at startup or for local dev setup.
Usage: python -m app.db.init_db
"""
import sys
import os

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine
from app.models import (
    User, RedlineCard, Machine, Run, RunParticipant,
    Pick, Wallet, Transaction, Post, Tournament
)


def init_db():
    print("🔧 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")


if __name__ == "__main__":
    init_db()
