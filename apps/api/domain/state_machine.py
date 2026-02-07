from enum import Enum


class RunState(str, Enum):
    OPEN = "open"
    PICKS_LOCKED = "picks_locked"
    RESULTS_POSTED = "results_posted"


def transition_on_results_posted() -> RunState:
    return RunState.RESULTS_POSTED
