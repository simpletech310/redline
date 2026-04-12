import os
import uuid
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.db.session import SessionLocal, engine
from app.models import (
    Base, User, RedlineCard, Machine, Run, RunParticipant,
    Pick, Wallet, Transaction, Post, AccountType
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def seed_db():
    db = SessionLocal()
    try:
        print("🌱 Seeding Redline database...")

        # Clear existing data safely
        # Base.metadata.drop_all(bind=engine) # Don't drop, just clear if needed
        # create_all is already run in on_startup, but just in case:
        Base.metadata.create_all(bind=engine)

        if db.query(User).count() > 0:
            print("⚠️ Database already contains data. Skipping seed.")
            return

        # --- USERS ---
        users_data = [
            {"username": "Ghost", "email": "ghost@redline.local", "type": "jockey"},
            {"username": "Apex", "email": "apex@redline.local", "type": "jockey"},
            {"username": "Nitro", "email": "nitro@redline.local", "type": "jockey"},
            {"username": "Turbo", "email": "turbo@redline.local", "type": "jockey"},
            {"username": "KingRodriguez", "email": "king@redline.local", "type": "team_owner"},
            {"username": "MikeTheSpec", "email": "mike@redline.local", "type": "spectator"},
            {"username": "SarahPicks", "email": "sarah@redline.local", "type": "spectator"},
        ]

        users = {}
        for u in users_data:
            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password("password123"),
                account_type=u["type"]
            )
            db.add(user)
            db.flush() # Get ID
            users[u["username"]] = user

            # Create Wallet for each
            wallet = Wallet(user_id=user.id, balance=1000.0)
            db.add(wallet)

            # Create RedlineCard for each
            card = RedlineCard(
                user_id=user.id,
                name=u["username"],
                bio=f"Bio for {u['username']}. Competitive motorsports veteran.",
                trust_score=95.0 + (5.0 * (1.0 if u['type'] != 'spectator' else 0.5)),
                core_stats={"wins": 10, "runs": 20} if u['type'] == 'jockey' else {},
            )
            db.add(card)

        # --- MACHINES ---
        machines = {
            "Ghost": Machine(
                owner_id=users["Ghost"].id,
                name="Black Mamba",
                vehicle_type="Nissan",
                vehicle_class="Street",
                motorsport="Drag",
                build_level="Performance",
                mods=["Turbo", "ECU", "Suspension"]
            ),
            "Apex": Machine(
                owner_id=users["Apex"].id,
                name="Crimson Dragon",
                vehicle_type="Mitsubishi",
                vehicle_class="Sport",
                motorsport="Circuit",
                build_level="Monster",
                mods=["AWD", "Big Turbo", "Roll Cage"]
            ),
            "Nitro": Machine(
                owner_id=users["Nitro"].id,
                name="Purple Reign",
                vehicle_type="Toyota",
                vehicle_class="Pro",
                motorsport="Drag",
                build_level="Pro",
                mods=["NOS", "Sequential", "Slicks"]
            )
        }
        for m in machines.values():
            db.add(m)
        db.flush()

        # --- POSTS ---
        posts_data = [
            ("Ghost", "Just finished tuning the Black Mamba. Ready for the NYE Battle! 🏁", "Drag"),
            ("KingRodriguez", "King's Court Racing is expanding. Looking for top talent in SoCal.", None),
            ("Nitro", "Irwindale is looking fast tonight. Perfect conditions for testing.", "Drag"),
            ("SarahPicks", "Just placed my picks for the New Year's battle. Ghost looks unbeatable.", "Drag"),
        ]

        for author, content, sport in posts_data:
            post = Post(author_id=users[author].id, content=content, motorsport=sport)
            db.add(post)

        # --- RUNS ---
        run1 = Run(
            name="New Year's Eve Street Battle",
            creator_id=users["Ghost"].id,
            location="Terminal Island, Long Beach",
            date_time=datetime.utcnow() + timedelta(days=6, hours=23),
            description="Head-to-head street class showdown. Winner takes all.",
            motorsport="Drag",
            entry_fee=500.0,
            max_participants=8,
            picks_enabled=True,
            status="open"
        )
        db.add(run1)
        db.flush()

        # Participants for Run 1
        p1 = RunParticipant(run_id=run1.id, user_id=users["Ghost"].id, vehicle_id=machines["Ghost"].id, odds=1.65)
        p2 = RunParticipant(run_id=run1.id, user_id=users["Turbo"].id, odds=2.30)
        db.add_all([p1, p2])

        db.commit()
        print("✅ Database successfully seeded with test data!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
