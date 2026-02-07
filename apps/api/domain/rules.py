from dataclasses import dataclass

from apps.api.models import AccountType


@dataclass(frozen=True)
class Settlement:
    winner_payout: float
    platform_cut: float


def can_create_run(account_type: AccountType, run_type: str) -> bool:
    if account_type == AccountType.SPECTATOR:
        return False
    if account_type == AccountType.JOCKEY and run_type == "Tournament":
        return False
    return True


def can_join_run(account_type: AccountType, already_joined: bool, wallet_balance: float, entry_fee: float) -> tuple[bool, str]:
    if account_type != AccountType.JOCKEY:
        return False, "Only jockeys can join runs"
    if already_joined:
        return False, "Already joined"
    if wallet_balance < entry_fee:
        return False, "Insufficient funds"
    return True, "ok"


def can_make_pick(picks_enabled: bool, picks_locked: bool, wallet_balance: float, amount: float) -> tuple[bool, str]:
    if not picks_enabled:
        return False, "Picks disabled"
    if picks_locked:
        return False, "Picks locked"
    if amount <= 0:
        return False, "Amount must be positive"
    if wallet_balance < amount:
        return False, "Insufficient funds"
    return True, "ok"


def settle_pot(entry_fee: float, participant_count: int, platform_cut_ratio: float = 0.10) -> Settlement:
    total_pot = entry_fee * participant_count
    platform_cut = total_pot * platform_cut_ratio
    return Settlement(winner_payout=total_pot - platform_cut, platform_cut=platform_cut)
