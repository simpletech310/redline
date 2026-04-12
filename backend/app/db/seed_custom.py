import os
import sys
from sqlalchemy.orm import Session

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.db.session import SessionLocal, engine
from app.models import (
    Base, User, RedlineCard, Machine, Wallet, Team, TeamMember, TeamMachine
)
from app.db.seed import hash_password

def seed_custom():
    db = SessionLocal()
    try:
        print("🌱 Seeding Custom Team and Jockeys...")

        # Create Users
        users_data = [
            {"username": "tj", "email": "tj@redline.local", "type": "jockey"},
            {"username": "Jay Z", "email": "jayz@redline.local", "type": "jockey"},
            {"username": "Milt", "email": "milt@redline.local", "type": "team_owner"},
        ]

        users = {}
        for u in users_data:
            user = db.query(User).filter_by(username=u["username"]).first()
            if not user:
                user = User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=hash_password("password123"),
                    account_type=u["type"]
                )
                db.add(user)
                db.flush()
                
                # Wallet
                wallet = Wallet(user_id=user.id, balance=5000.0)
                db.add(wallet)
                
                # Card
                card = RedlineCard(
                    user_id=user.id,
                    name=u["username"],
                    bio=f"Top tier racer." if u["type"] == "jockey" else "Team owner.",
                    trust_score=98.0,
                    core_stats={"wins": 15, "runs": 22, "win_rate": 0.68} if u['type'] == 'jockey' else {},
                )
                db.add(card)
            
            users[u["username"]] = user

        # Create Machines
        tj_machine = db.query(Machine).filter_by(name="TJ's Demon").first()
        if not tj_machine:
            tj_machine = Machine(
                owner_id=users["tj"].id,
                name="TJ's Demon",
                vehicle_type="Dodge",
                vehicle_class="Pro",
                motorsport="Drag",
                build_level="Monster",
                mods=["Supercharger", "Slicks"],
                inferred_stats={"hp": 1000, "0-60": 2.1}
            )
            db.add(tj_machine)
            
        jayz_machine = db.query(Machine).filter_by(name="Hov's Hayabusa").first()
        if not jayz_machine:
            jayz_machine = Machine(
                owner_id=users["Jay Z"].id,
                name="Hov's Hayabusa",
                vehicle_type="Suzuki",
                vehicle_class="Motorcycle",
                motorsport="Drag",
                build_level="Performance",
                mods=["Stretched Swingarm", "Nitrous"],
                inferred_stats={"hp": 300, "0-60": 2.4}
            )
            db.add(jayz_machine)
            
        team_machine = db.query(Machine).filter_by(name="BSSD Dragster").first()
        if not team_machine:
            team_machine = Machine(
                owner_id=users["Milt"].id,
                name="BSSD Dragster",
                vehicle_type="Custom",
                vehicle_class="Pro Mod",
                motorsport="Drag",
                build_level="Monster",
                mods=["Twin Turbo", "Parachute"],
                inferred_stats={"hp": 3000, "0-60": 1.0}
            )
            db.add(team_machine)

        db.flush()

        # Create Team
        team = db.query(Team).filter_by(name="Be Saf Stay Dangerous").first()
        if not team:
            team = Team(
                name="Be Saf Stay Dangerous",
                owner_id=users["Milt"].id,
                bio="BSSD Racing. We take over the streets.",
                region="SoCal",
                motorsport="Drag",
                aggregate_stats={"total_wins": 35}
            )
            db.add(team)
            db.flush()

        # Add Members to Team
        jayz_member = db.query(TeamMember).filter_by(team_id=team.id, user_id=users["Jay Z"].id).first()
        if not jayz_member:
            db.add(TeamMember(team_id=team.id, user_id=users["Jay Z"].id, role="captain"))
            
        # Add Team Machine
        tm = db.query(TeamMachine).filter_by(team_id=team.id, machine_id=team_machine.id).first()
        if not tm:
            db.add(TeamMachine(team_id=team.id, machine_id=team_machine.id, added_by=users["Milt"].id, can_use=[users["Jay Z"].id]))

        db.commit()
        print("✅ Custom seed successful!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_custom()
