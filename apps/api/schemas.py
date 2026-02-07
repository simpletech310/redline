from datetime import datetime

from pydantic import BaseModel, Field

from apps.api.models import AccountType, RunType


class CreateAccountRequest(BaseModel):
    username: str
    email: str
    account_type: AccountType
    initial_balance: float = 0.0


class CreateRunRequest(BaseModel):
    name: str
    run_type: RunType
    date_time: datetime
    location: str
    description: str
    machine_class: str
    entry_fee: float = 0.0
    picks_enabled: bool = True


class JoinRunRequest(BaseModel):
    user_id: str


class MakePickRequest(BaseModel):
    user_id: str
    prediction: str
    amount: float = Field(gt=0)


class PostResultsRequest(BaseModel):
    actor_id: str
    winner_id: str
    times: dict[str, str]
