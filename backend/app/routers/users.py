from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.models import User, RedlineCard, Machine
from app.routers.auth import get_current_user

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# MINI BIKE SPECS & STATS CALCULATION
# ──────────────────────────────────────────────────────────────────────────────

MINI_BIKE_SPECS = {
    # Original mini bikes
    "Pocket Bike": {"cc": 49, "hp": 2.5, "weight": 45, "top_speed": 30},
    "Pit Bike": {"cc": 110, "hp": 8, "weight": 130, "top_speed": 55},
    "Mini Moto": {"cc": 40, "hp": 4, "weight": 35, "top_speed": 45},
    "KX65": {"cc": 65, "hp": 12, "weight": 115, "top_speed": 60},
    "KLX110": {"cc": 112, "hp": 7, "weight": 155, "top_speed": 50},
    # Honda CRF Series
    "CRF50": {"cc": 50, "hp": 3, "weight": 110, "top_speed": 28},
    "CRF70": {"cc": 72, "hp": 5, "weight": 120, "top_speed": 40},
    "CRF110": {"cc": 109, "hp": 8, "weight": 150, "top_speed": 52},
    "CRF125": {"cc": 125, "hp": 10, "weight": 195, "top_speed": 58},
    # Yamaha TTR Series
    "TTR50": {"cc": 50, "hp": 3, "weight": 115, "top_speed": 26},
    "TTR110": {"cc": 110, "hp": 7, "weight": 160, "top_speed": 48},
    "TTR125": {"cc": 124, "hp": 9, "weight": 175, "top_speed": 55},
    # Classic Honda
    "Z50": {"cc": 50, "hp": 2.5, "weight": 100, "top_speed": 28},
    "XR50": {"cc": 50, "hp": 3, "weight": 105, "top_speed": 30},
    "XR70": {"cc": 72, "hp": 5, "weight": 130, "top_speed": 42},
    "XR100": {"cc": 99, "hp": 7, "weight": 145, "top_speed": 50},
    # Chinese / SSR / Thumpstar
    "SSR125": {"cc": 125, "hp": 9, "weight": 145, "top_speed": 58},
    "SSR140": {"cc": 140, "hp": 12, "weight": 150, "top_speed": 65},
    "SSR160": {"cc": 160, "hp": 15, "weight": 155, "top_speed": 70},
    "Thumpstar 125": {"cc": 125, "hp": 10, "weight": 140, "top_speed": 62},
    "Thumpstar 140": {"cc": 140, "hp": 13, "weight": 145, "top_speed": 68},
    # YCF / Piranha
    "YCF 125": {"cc": 125, "hp": 11, "weight": 138, "top_speed": 60},
    "YCF 150": {"cc": 150, "hp": 16, "weight": 145, "top_speed": 72},
    "Piranha 140": {"cc": 140, "hp": 14, "weight": 142, "top_speed": 68},
    "Piranha 190": {"cc": 190, "hp": 20, "weight": 155, "top_speed": 78},
}

BUILD_LEVEL_MULTIPLIERS = {
    "stock": {"hp_mult": 1.0, "reliability_mod": 0, "top_speed_mult": 1.0},
    "mild": {"hp_mult": 1.15, "reliability_mod": -5, "top_speed_mult": 1.08},
    "performance": {"hp_mult": 1.35, "reliability_mod": -15, "top_speed_mult": 1.18},
    "monster": {"hp_mult": 1.6, "reliability_mod": -25, "top_speed_mult": 1.30},
}

MOD_EFFECTS = {
    # Exhaust
    "Stage 1 Exhaust": {"hp_add": 0.5, "description": "Basic performance exhaust"},
    "Stage 2 Exhaust": {"hp_add": 1.0, "description": "Full race exhaust system"},
    "Big Bore Exhaust": {"hp_add": 1.5, "description": "Large diameter headers"},
    # Carburetor / Fuel
    "Race Carb": {"hp_add": 0.8, "description": "High-flow carburetor"},
    "Mikuni Flatslide": {"hp_add": 1.5, "description": "Premium flat-slide carb"},
    "Keihin FCR": {"hp_add": 2.0, "description": "Top-tier race carburetor"},
    "Fuel Injection Kit": {"hp_add": 2.5, "description": "EFI conversion"},
    # Engine Internals
    "Big Bore Kit": {"hp_add": 2.0, "cc_add": 20, "description": "Increased displacement"},
    "Big Bore 170cc": {"hp_add": 4.0, "cc_add": 50, "description": "Major displacement increase"},
    "Port & Polish": {"hp_add": 1.2, "description": "Ported and polished head"},
    "High Comp Piston": {"hp_add": 1.0, "description": "High compression piston"},
    "Race Cam": {"hp_add": 1.5, "description": "Aggressive camshaft"},
    "Stroker Crank": {"hp_add": 3.0, "cc_add": 15, "description": "Stroker crankshaft"},
    # Ignition
    "Race CDI": {"hp_add": 0.5, "description": "Adjustable ignition timing"},
    "High Rev CDI": {"hp_add": 0.8, "description": "Extended rev limit CDI"},
    # Clutch / Trans
    "Race Clutch": {"launch_bonus": 15, "description": "Heavy-duty clutch"},
    "Manual Clutch Conversion": {"launch_bonus": 20, "description": "Manual clutch swap"},
    "Close Ratio Gears": {"top_speed_add": 5, "description": "Close ratio transmission"},
    # Suspension / Handling
    "Upgraded Forks": {"handling": 10, "description": "Performance front forks"},
    "Rear Shock Upgrade": {"handling": 10, "description": "Adjustable rear shock"},
    "Full Suspension Kit": {"handling": 20, "description": "Complete suspension upgrade"},
    "Swingarm Extension": {"launch_bonus": 10, "description": "Extended swingarm"},
    # Misc
    "Lightweight Wheels": {"weight_reduce": 5, "description": "Aluminum wheels"},
    "Oil Cooler": {"reliability_bonus": 5, "description": "Engine oil cooler"},
}


def calculate_inferred_stats(vehicle_type: str, build_level: str,
                              mods: list, reliability: float,
                              motorsport: str = None) -> dict:
    """Calculate machine stats based on specs, build level, and mods."""
    # Get base specs
    if motorsport == "Mini Bikes" and vehicle_type in MINI_BIKE_SPECS:
        base = MINI_BIKE_SPECS[vehicle_type]
    else:
        # Default stats for unknown vehicles
        return {}

    # Get build multipliers
    multipliers = BUILD_LEVEL_MULTIPLIERS.get(build_level, BUILD_LEVEL_MULTIPLIERS["stock"])

    # Start with base stats
    hp = base["hp"] * multipliers["hp_mult"]
    cc = base["cc"]
    top_speed = base["top_speed"] * multipliers["top_speed_mult"]
    weight = base["weight"]
    handling_bonus = 0
    launch_bonus = 0
    reliability_bonus = 0

    # Apply mods
    for mod in (mods or []):
        effects = MOD_EFFECTS.get(mod, {})
        hp += effects.get("hp_add", 0)
        cc += effects.get("cc_add", 0)
        top_speed += effects.get("top_speed_add", 0)
        weight -= effects.get("weight_reduce", 0)
        handling_bonus += effects.get("handling", 0)
        launch_bonus += effects.get("launch_bonus", 0)
        reliability_bonus += effects.get("reliability_bonus", 0)

    # Calculate derived stats
    power_to_weight = hp / (weight / 100)
    # Estimate 60ft time based on power-to-weight (lower is better)
    estimated_60ft = max(1.8, 4.5 - (power_to_weight * 0.2) - (launch_bonus * 0.02))
    # Estimate quarter mile based on HP and weight
    estimated_quarter = max(8.0, 18.0 - (hp * 0.3) - (power_to_weight * 0.5))

    # Effective reliability
    effective_reliability = reliability + multipliers["reliability_mod"] + reliability_bonus
    effective_reliability = max(10, min(100, effective_reliability))

    return {
        "horsepower": round(hp, 1),
        "displacement_cc": cc,
        "weight_lbs": weight,
        "power_to_weight": round(power_to_weight, 2),
        "estimated_top_mph": round(min(top_speed, 85), 1),
        "estimated_60ft_sec": round(estimated_60ft, 2),
        "estimated_quarter_sec": round(estimated_quarter, 1),
        "handling_rating": min(100, 50 + handling_bonus),
        "launch_rating": min(100, 50 + launch_bonus),
        "reliability_rating": round(effective_reliability, 1),
        "build_tier": build_level,
        "mod_count": len(mods or []),
    }


class CardUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


class CardOut(BaseModel):
    id: str
    name: str
    bio: str
    trust_score: float
    stats: Optional[dict] = None

    class Config:
        from_attributes = True


class MachineCreate(BaseModel):
    vehicle_type: str
    vehicle_class: Optional[str] = None
    motorsport: Optional[str] = None
    name: Optional[str] = None
    build_level: str = "stock"
    reliability_level: float = 80.0
    mods: Optional[list] = []


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    build_level: Optional[str] = None
    reliability_level: Optional[float] = None
    mods: Optional[list] = None
    is_public: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    account_type: str
    class Config:
        from_attributes = True


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/card")
def get_card(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = db.query(RedlineCard).filter(RedlineCard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    stats = card.core_stats or {}
    return {
        "id": card.id,
        "name": card.name or current_user.username,
        "bio": card.bio,
        "trust_score": card.trust_score,
        "stats": stats,
    }


@router.put("/card")
def update_card(update: CardUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = db.query(RedlineCard).filter(RedlineCard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    if update.name is not None:
        card.name = update.name
    if update.bio is not None:
        card.bio = update.bio
    db.commit()
    db.refresh(card)
    return {"id": card.id, "name": card.name, "bio": card.bio, "trust_score": card.trust_score}


@router.get("/machines")
def get_machines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    machines = db.query(Machine).filter(Machine.owner_id == current_user.id).all()
    return [
        {
            "id": m.id, "name": m.name, "vehicle_type": m.vehicle_type,
            "vehicle_class": m.vehicle_class, "motorsport": m.motorsport,
            "build_level": m.build_level, "reliability_level": m.reliability_level,
            "mods": m.mods, "inferred_stats": m.inferred_stats or {}, "is_public": m.is_public,
        }
        for m in machines
    ]


@router.get("/machines/{machine_id}")
def get_machine(machine_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id, Machine.owner_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {"id": m.id, "name": m.name, "vehicle_type": m.vehicle_type, "vehicle_class": m.vehicle_class,
            "motorsport": m.motorsport, "build_level": m.build_level, "reliability_level": m.reliability_level,
            "mods": m.mods or [], "inferred_stats": m.inferred_stats or {}, "is_public": m.is_public}


@router.post("/machines", status_code=201)
def create_machine(data: MachineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate inferred stats
    inferred_stats = calculate_inferred_stats(
        vehicle_type=data.vehicle_type,
        build_level=data.build_level,
        mods=data.mods or [],
        reliability=data.reliability_level,
        motorsport=data.motorsport
    )

    m = Machine(
        owner_id=current_user.id,
        vehicle_type=data.vehicle_type,
        vehicle_class=data.vehicle_class,
        motorsport=data.motorsport,
        name=data.name,
        build_level=data.build_level,
        reliability_level=data.reliability_level,
        mods=data.mods or [],
        inferred_stats=inferred_stats,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {
        "id": m.id, "name": m.name, "vehicle_type": m.vehicle_type, "vehicle_class": m.vehicle_class,
        "motorsport": m.motorsport, "build_level": m.build_level, "is_public": m.is_public,
        "inferred_stats": inferred_stats
    }


@router.put("/machines/{machine_id}")
def update_machine(machine_id: str, update: MachineUpdate,
                   current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id, Machine.owner_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")

    for field, val in update.dict(exclude_unset=True).items():
        setattr(m, field, val)

    # Recalculate inferred stats if relevant fields changed
    if any(f in update.dict(exclude_unset=True) for f in ['build_level', 'mods', 'reliability_level']):
        m.inferred_stats = calculate_inferred_stats(
            vehicle_type=m.vehicle_type,
            build_level=m.build_level,
            mods=m.mods or [],
            reliability=m.reliability_level,
            motorsport=m.motorsport
        )

    db.commit()
    return {
        "id": m.id, "name": m.name, "build_level": m.build_level,
        "inferred_stats": m.inferred_stats or {}
    }


@router.patch("/machines/{machine_id}/privacy")
def toggle_privacy(machine_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id, Machine.owner_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Machine not found")
    m.is_public = not m.is_public
    db.commit()
    return {"id": m.id, "is_public": m.is_public}
