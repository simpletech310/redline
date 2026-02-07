from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .models import AccountType, MachineClass, RunType, AccessType

# Auth Schemas
class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str
    account_type: AccountType

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    account_type: AccountType

class UserResponse(UserBase):
    id: int
    stripe_onboarding_complete: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AccountUpgrade(BaseModel):
    new_account_type: AccountType

# Redline Card Schemas
class RedlineCardCreate(BaseModel):
    name: str
    bio: Optional[str] = None
    classes: List[str] = []

class RedlineCardResponse(BaseModel):
    id: int
    name: str
    bio: Optional[str]
    classes: List[str]
    stats: Dict[str, Any]
    history: List[Dict[str, Any]]
    trust_score: float
    verified: bool
    
    class Config:
        from_attributes = True

# Machine Schemas
class MachineCreate(BaseModel):
    name: str
    year: int
    make: str
    model: str
    machine_class: MachineClass
    engine: str
    parts: List[str] = []
    stats: Dict[str, Any] = {}

class MachineResponse(MachineCreate):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Run Schemas
class RunCreate(BaseModel):
    name: str
    run_type: RunType
    date_time: datetime
    location: str
    description: Optional[str] = None
    machine_class: MachineClass
    entry_fee: float = 0.0
    access_type: AccessType
    access_price: float = 0.0
    picks_enabled: bool = True

class RunResponse(RunCreate):
    id: int
    run_id: str
    creator_id: int
    picks_locked: bool
    results_posted: bool
    results: Dict[str, Any]
    created_at: datetime
    participants: List["RunParticipantResponse"]
    
    class Config:
        from_attributes = True

class RunParticipantResponse(BaseModel):
    id: int
    user_id: int
    odds: float
    joined_at: datetime
    
    class Config:
        from_attributes = True

# Pick Schemas
class PickCreate(BaseModel):
    run_id: str
    prediction_user_id: int
    amount: float

class PickResponse(BaseModel):
    id: int
    pick_id: str
    user_id: int
    run_id: int
    prediction_user_id: int
    amount: float
    odds: float
    locked: bool
    won: Optional[bool]
    payout: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# Wallet Schemas
class WalletResponse(BaseModel):
    id: int
    balance: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    amount: float
    description: str
    transaction_type: str
    created_at: datetime
    balance_after: float
    
    class Config:
        from_attributes = True

# Results Posting
class PostResults(BaseModel):
    winner_user_id: int
    times: Dict[int, str]  # user_id: time