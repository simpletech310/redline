from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models import Team, TeamMember, TeamInvite, TeamMachine, User, Machine, AccountType
from app.routers.auth import get_current_user

router = APIRouter()


class TeamCreate(BaseModel):
    name: str
    bio: Optional[str] = ""
    region: Optional[str] = None
    motorsport: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    region: Optional[str] = None
    motorsport: Optional[str] = None


class InviteCreate(BaseModel):
    user_id: str
    message: Optional[str] = None


class FleetAdd(BaseModel):
    machine_id: str
    can_use: Optional[List[str]] = []


def _serialize_team(t: Team) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "owner": {
            "id": t.owner.id,
            "username": t.owner.username,
        } if t.owner else None,
        "bio": t.bio,
        "logo_url": t.logo_url,
        "region": t.region,
        "motorsport": t.motorsport,
        "aggregate_stats": t.aggregate_stats or {},
        "member_count": len(t.members) if t.members else 0,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_member(m: TeamMember) -> dict:
    return {
        "id": m.id,
        "user_id": m.user_id,
        "username": m.user.username if m.user else None,
        "role": m.role,
        "joined_at": m.joined_at.isoformat() if m.joined_at else None,
    }


def _serialize_invite(i: TeamInvite) -> dict:
    return {
        "id": i.id,
        "team": {"id": i.team.id, "name": i.team.name} if i.team else None,
        "inviter": {"id": i.inviter.id, "username": i.inviter.username} if i.inviter else None,
        "invitee": {"id": i.invitee.id, "username": i.invitee.username} if i.invitee else None,
        "message": i.message,
        "status": i.status,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "expires_at": i.expires_at.isoformat() if i.expires_at else None,
    }


def _serialize_fleet_machine(tm: TeamMachine) -> dict:
    m = tm.machine
    return {
        "id": tm.id,
        "machine_id": tm.machine_id,
        "machine": {
            "id": m.id,
            "name": m.name,
            "vehicle_type": m.vehicle_type,
            "vehicle_class": m.vehicle_class,
            "build_level": m.build_level,
            "inferred_stats": m.inferred_stats or {},
        } if m else None,
        "can_use": tm.can_use or [],
        "added_at": tm.added_at.isoformat() if tm.added_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# TEAM CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("")
def list_teams(db: Session = Depends(get_db)):
    """List all teams."""
    teams = db.query(Team).order_by(Team.created_at.desc()).limit(50).all()
    return {"teams": [_serialize_team(t) for t in teams]}


@router.get("/{team_id}")
def get_team(team_id: str, db: Session = Depends(get_db)):
    """Get team profile."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return _serialize_team(team)


@router.get("/{team_id}/members")
def get_team_members(team_id: str, db: Session = Depends(get_db)):
    """Get team roster."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"members": [_serialize_member(m) for m in team.members]}


@router.post("", status_code=201)
def create_team(data: TeamCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a team (team_owner only)."""
    account_type = str(getattr(current_user.account_type, 'value', current_user.account_type))
    if account_type != "team_owner":
        raise HTTPException(status_code=403, detail="Only team owners can create teams")

    # Check if team name is taken
    existing = db.query(Team).filter(Team.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already taken")

    team = Team(
        name=data.name,
        owner_id=current_user.id,
        bio=data.bio,
        region=data.region,
        motorsport=data.motorsport,
    )
    db.add(team)
    db.flush()

    # Add owner as a member with "owner" role
    owner_member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(owner_member)
    db.commit()
    db.refresh(team)

    return _serialize_team(team)


@router.put("/{team_id}")
def update_team(team_id: str, data: TeamUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update team profile (owner only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can update the team")

    if data.name is not None:
        # Check if new name is taken
        existing = db.query(Team).filter(Team.name == data.name, Team.id != team_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Team name already taken")
        team.name = data.name

    if data.bio is not None:
        team.bio = data.bio
    if data.region is not None:
        team.region = data.region
    if data.motorsport is not None:
        team.motorsport = data.motorsport

    db.commit()
    return _serialize_team(team)


@router.delete("/{team_id}")
def delete_team(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete team (owner only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can delete the team")

    db.delete(team)
    db.commit()
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────────
# INVITES
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{team_id}/invite")
def invite_to_team(team_id: str, data: InviteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invite a jockey to join the team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if current user is owner or captain
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["owner", "captain"]:
        raise HTTPException(status_code=403, detail="Only team owner or captain can invite members")

    # Check invitee exists and is a jockey
    invitee = db.query(User).filter(User.id == data.user_id).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")

    invitee_type = str(getattr(invitee.account_type, 'value', invitee.account_type))
    if invitee_type == "spectator":
        raise HTTPException(status_code=400, detail="Cannot invite spectators to team")

    # Check if already a member
    existing_member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == data.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a team member")

    # Check if pending invite exists
    existing_invite = db.query(TeamInvite).filter(
        TeamInvite.team_id == team_id,
        TeamInvite.invitee_id == data.user_id,
        TeamInvite.status == "pending"
    ).first()
    if existing_invite:
        raise HTTPException(status_code=400, detail="Invite already pending for this user")

    invite = TeamInvite(
        team_id=team_id,
        inviter_id=current_user.id,
        invitee_id=data.user_id,
        message=data.message,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return _serialize_invite(invite)


@router.get("/invites/my")
def get_my_invites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get my pending team invites."""
    invites = db.query(TeamInvite).filter(
        TeamInvite.invitee_id == current_user.id,
        TeamInvite.status == "pending",
        TeamInvite.expires_at > datetime.utcnow()
    ).all()
    return {"invites": [_serialize_invite(i) for i in invites]}


@router.post("/invites/{invite_id}/accept")
def accept_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Accept a team invite."""
    invite = db.query(TeamInvite).filter(TeamInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.invitee_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invite is not for you")

    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status}")

    if invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired")

    # Add as team member
    member = TeamMember(
        team_id=invite.team_id,
        user_id=current_user.id,
        role="member",
    )
    db.add(member)

    invite.status = "accepted"
    invite.responded_at = datetime.utcnow()
    db.commit()

    return {"accepted": True, "team_id": invite.team_id}


@router.post("/invites/{invite_id}/decline")
def decline_invite(invite_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Decline a team invite."""
    invite = db.query(TeamInvite).filter(TeamInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.invitee_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invite is not for you")

    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is already {invite.status}")

    invite.status = "declined"
    invite.responded_at = datetime.utcnow()
    db.commit()

    return {"declined": True}


@router.post("/{team_id}/leave")
def leave_team(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Leave a team."""
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of this team")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Team owner cannot leave. Transfer ownership or delete the team.")

    db.delete(member)
    db.commit()

    return {"left": True}


@router.delete("/{team_id}/members/{user_id}")
def remove_member(team_id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove a member from team (owner only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can remove members")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself. Use delete team instead.")

    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="User is not a team member")

    db.delete(member)
    db.commit()

    return {"removed": True}


# ─────────────────────────────────────────────────────────────────────────────
# FLEET MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{team_id}/fleet")
def get_team_fleet(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get team's shared machines (members only)."""
    # Check if user is a member
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Only team members can view the fleet")

    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return {"fleet": [_serialize_fleet_machine(tm) for tm in team.fleet]}


@router.post("/{team_id}/fleet")
def add_to_fleet(team_id: str, data: FleetAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add a machine to team fleet (owner only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can add machines to fleet")

    # Check machine exists and belongs to the owner
    machine = db.query(Machine).filter(Machine.id == data.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    if machine.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add machines you own")

    # Check if already in fleet
    existing = db.query(TeamMachine).filter(
        TeamMachine.team_id == team_id,
        TeamMachine.machine_id == data.machine_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Machine is already in fleet")

    fleet_machine = TeamMachine(
        team_id=team_id,
        machine_id=data.machine_id,
        added_by=current_user.id,
        can_use=data.can_use or [],
    )
    db.add(fleet_machine)
    db.commit()
    db.refresh(fleet_machine)

    return _serialize_fleet_machine(fleet_machine)


@router.delete("/{team_id}/fleet/{machine_id}")
def remove_from_fleet(team_id: str, machine_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove a machine from team fleet (owner only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can remove machines from fleet")

    fleet_machine = db.query(TeamMachine).filter(
        TeamMachine.team_id == team_id,
        TeamMachine.machine_id == machine_id
    ).first()
    if not fleet_machine:
        raise HTTPException(status_code=404, detail="Machine not in fleet")

    db.delete(fleet_machine)
    db.commit()

    return {"removed": True}


@router.get("/{team_id}/available-machines")
def get_available_machines(team_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get machines available to me (own + team fleet)."""
    # Check if user is a member
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Only team members can access this")

    # Get own machines
    own_machines = db.query(Machine).filter(Machine.owner_id == current_user.id).all()

    # Get team fleet machines available to this user
    team = db.query(Team).filter(Team.id == team_id).first()
    fleet_machines = []
    for tm in team.fleet:
        # If can_use is empty, all members can use. Otherwise, check if user is in list.
        if not tm.can_use or current_user.id in tm.can_use:
            fleet_machines.append(tm.machine)

    return {
        "own": [
            {"id": m.id, "name": m.name, "vehicle_type": m.vehicle_type, "source": "own"}
            for m in own_machines
        ],
        "team_fleet": [
            {"id": m.id, "name": m.name, "vehicle_type": m.vehicle_type, "source": "team"}
            for m in fleet_machines
        ],
    }
