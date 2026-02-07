import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apps.api.db.base import Base


class AccountType(str, Enum):
    SPECTATOR = "Spectator"
    JOCKEY = "Jockey"
    TEAM_OWNER = "Team Owner"


class RunType(str, Enum):
    RACE = "Race"
    TOURNAMENT = "Tournament"


class PickType(str, Enum):
    WINNER = "Winner"


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    account_type: Mapped[AccountType] = mapped_column(SAEnum(AccountType, name="account_type"))
    team_owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    card: Mapped["CardORM"] = relationship(back_populates="user", uselist=False)
    wallet: Mapped["WalletORM"] = relationship(back_populates="user", uselist=False)


class CardORM(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    bio: Mapped[str] = mapped_column(Text, default="")
    classes: Mapped[dict] = mapped_column(JSON, default=dict)
    stats: Mapped[dict] = mapped_column(JSON, default=dict)
    history: Mapped[dict] = mapped_column(JSON, default=dict)
    trust_score: Mapped[float] = mapped_column(Float, default=100.0)

    user: Mapped[UserORM] = relationship(back_populates="card")


class RunORM(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String)
    run_type: Mapped[RunType] = mapped_column(SAEnum(RunType, name="run_type"))
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    date_time: Mapped[datetime] = mapped_column(DateTime)
    location: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    machine_class: Mapped[str] = mapped_column(String)
    entry_fee: Mapped[float] = mapped_column(Float, default=0)
    picks_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    picks_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    results_posted: Mapped[bool] = mapped_column(Boolean, default=False)
    current_odds: Mapped[dict] = mapped_column(JSON, default=dict)


class RunParticipantORM(Base):
    __tablename__ = "run_participants"
    __table_args__ = (UniqueConstraint("run_id", "user_id", name="uq_run_user"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)


class PickORM(Base):
    __tablename__ = "picks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), index=True)
    pick_type: Mapped[PickType] = mapped_column(SAEnum(PickType, name="pick_type"), default=PickType.WINNER)
    prediction: Mapped[str] = mapped_column(String)
    amount: Mapped[float] = mapped_column(Float)
    odds: Mapped[float] = mapped_column(Float)
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    won: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    payout: Mapped[float] = mapped_column(Float, default=0)


class WalletORM(Base):
    __tablename__ = "wallets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    balance: Mapped[float] = mapped_column(Float, default=0)

    user: Mapped[UserORM] = relationship(back_populates="wallet")


class TransactionORM(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id: Mapped[str] = mapped_column(ForeignKey("wallets.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(String)
    transaction_type: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ResultSnapshotORM(Base):
    __tablename__ = "result_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), unique=True)
    winner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    times: Mapped[dict] = mapped_column(JSON, default=dict)
    payout: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
