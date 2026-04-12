import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, Enum as SAEnum,
    Float, ForeignKey, Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class AccountType(str, Enum):
    SPECTATOR = "spectator"
    JOCKEY = "jockey"
    TEAM_OWNER = "team_owner"


class BuildLevel(str, Enum):
    STOCK = "stock"
    MILD = "mild"
    PERFORMANCE = "performance"
    MONSTER = "monster"


class RunStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PickType(str, Enum):
    WINNER = "winner"
    H2H = "h2h"
    TIME_OVER_UNDER = "time_over_under"
    REACTION_TIME = "reaction_time"
    FIRST_OFF_LINE = "first_off_line"


class TournamentStatus(str, Enum):
    REGISTRATION = "registration"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    account_type = Column(SAEnum(AccountType, name="account_type"), default=AccountType.SPECTATOR)
    region = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    card = relationship("RedlineCard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    machines = relationship("Machine", back_populates="owner", cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")


class RedlineCard(Base):
    __tablename__ = "redline_cards"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, default="")
    bio = Column(Text, default="")
    trust_score = Column(Float, default=100.0)
    core_stats = Column(JSON, default=dict)  # wins, losses, etc.
    sport_stats = Column(JSON, default=dict)
    highlights = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="card")


class Machine(Base):
    __tablename__ = "machines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)        # Nickname
    vehicle_type = Column(String, nullable=False)
    vehicle_class = Column(String, nullable=True)
    motorsport = Column(String, nullable=True)
    build_level = Column(String, default="stock")
    reliability_level = Column(Float, default=80.0)
    mods = Column(JSON, default=list)
    inferred_stats = Column(JSON, default=dict)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="machines")


class Run(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    motorsport = Column(String, nullable=True)
    race_type = Column(String, nullable=True)
    race_format = Column(String, nullable=True)
    distance = Column(String, nullable=True)
    surface = Column(String, nullable=True)
    conditions = Column(String, nullable=True)
    location = Column(String, nullable=False)
    date_time = Column(DateTime, nullable=False)
    entry_fee = Column(Float, default=0.0)
    max_participants = Column(Integer, default=8)
    description = Column(Text, nullable=True)
    picks_enabled = Column(Boolean, default=True)
    picks_locked = Column(Boolean, default=False)
    results_posted = Column(Boolean, default=False)
    allowed_classes = Column(JSON, default=list)
    current_odds = Column(JSON, default=dict)
    status = Column(String, default="open")
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("RunParticipant", back_populates="run", cascade="all, delete-orphan")


class RunParticipant(Base):
    __tablename__ = "run_participants"
    __table_args__ = (UniqueConstraint("run_id", "user_id"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("runs.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(String, ForeignKey("machines.id"), nullable=True)
    odds = Column(Float, default=2.0)
    placement = Column(Integer, nullable=True)
    best_et = Column(Float, nullable=True)
    reaction_time = Column(Float, nullable=True)
    false_start = Column(Boolean, default=False)
    dnf_mechanical = Column(Boolean, default=False)
    dnf_rider_error = Column(Boolean, default=False)
    first_off_line = Column(Boolean, nullable=True)  # For first off line picks
    joined_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="participants")
    vehicle = relationship("Machine")
    user = relationship("User")


class Pick(Base):
    __tablename__ = "picks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False)
    pick_type = Column(String, default="winner")
    prediction = Column(String, nullable=False)
    secondary_prediction = Column(String, nullable=True)  # For H2H: opponent username
    threshold_value = Column(Float, nullable=True)  # For over/under: the time threshold
    threshold_direction = Column(String, nullable=True)  # "over" or "under"
    amount = Column(Float, default=0.0)
    odds = Column(Float, default=2.0)
    locked = Column(Boolean, default=False)
    won = Column(Boolean, nullable=True)
    payout = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run")
    user = relationship("User")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String, ForeignKey("wallets.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    transaction_type = Column(String, nullable=False)
    balance_after = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="transactions")


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    motorsport = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    reaction_counts = Column(JSON, default=dict)
    comment_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User")


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    motorsport = Column(String, nullable=True)
    location = Column(String, nullable=False)
    date_time = Column(DateTime, nullable=False)
    entry_fee_cents = Column(Integer, default=0)
    prize_pool_cents = Column(Integer, default=0)
    max_participants = Column(Integer, default=8)
    current_round = Column(Integer, default=0)
    status = Column(String, default="registration")
    bracket = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChallengeStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    COMPLETED = "completed"


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    challenger_id = Column(String, ForeignKey("users.id"), nullable=False)
    challenged_id = Column(String, ForeignKey("users.id"), nullable=False)
    motorsport = Column(String, nullable=True)
    vehicle_class = Column(String, nullable=True)
    location = Column(String, nullable=False)
    proposed_time = Column(DateTime, nullable=False)
    stakes = Column(Float, default=0.0)
    message = Column(Text, nullable=True)
    status = Column(String, default="pending")
    run_id = Column(String, ForeignKey("runs.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)

    challenger = relationship("User", foreign_keys=[challenger_id])
    challenged = relationship("User", foreign_keys=[challenged_id])
    run = relationship("Run")


class MemberRole(str, Enum):
    OWNER = "owner"
    CAPTAIN = "captain"
    MEMBER = "member"


class InviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class Team(Base):
    __tablename__ = "teams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    bio = Column(Text, default="")
    logo_url = Column(String, nullable=True)
    region = Column(String, nullable=True)
    motorsport = Column(String, nullable=True)
    aggregate_stats = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    fleet = relationship("TeamMachine", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User")


class TeamInvite(Base):
    __tablename__ = "team_invites"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    inviter_id = Column(String, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)

    team = relationship("Team")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])


class TeamMachine(Base):
    __tablename__ = "team_machines"
    __table_args__ = (UniqueConstraint("team_id", "machine_id"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    machine_id = Column(String, ForeignKey("machines.id"), nullable=False)
    added_by = Column(String, ForeignKey("users.id"), nullable=False)
    can_use = Column(JSON, default=list)
    added_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="fleet")
    machine = relationship("Machine")


class StreamStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    ENDED = "ended"


class LiveStream(Base):
    """Live streaming for races via Mux."""
    __tablename__ = "live_streams"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    run_id = Column(String, ForeignKey("runs.id"), nullable=True)  # Optional: link to race
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    motorsport = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    # Mux fields
    mux_stream_key = Column(String, nullable=True)  # For broadcaster (RTMP)
    mux_live_stream_id = Column(String, nullable=True)  # Mux's ID
    mux_playback_id = Column(String, nullable=True)  # Public playback ID

    status = Column(String, default="idle")  # idle, active, ended
    viewer_count = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User")
    run = relationship("Run")
