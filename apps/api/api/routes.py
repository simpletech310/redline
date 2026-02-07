from fastapi import APIRouter, HTTPException

from apps.api.schemas import CreateAccountRequest, CreateRunRequest, JoinRunRequest, MakePickRequest, PostResultsRequest
from apps.api.services.accounts_service import AccountsService
from apps.api.services.picks_service import PicksService
from apps.api.services.results_service import ResultsService
from apps.api.services.runs_service import RunsService
from apps.api.services.wallet_service import WalletService

router = APIRouter()
accounts_service = AccountsService()
runs_service = RunsService()
picks_service = PicksService()
wallet_service = WalletService()
results_service = ResultsService()


@router.post("/accounts")
def create_account(payload: CreateAccountRequest):
    user = accounts_service.create_account(**payload.model_dump())
    return {"id": user.id, "username": user.username}


@router.get("/accounts/{username}")
def login(username: str):
    user = accounts_service.login(username)
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user.id, "username": user.username, "account_type": user.account_type}


@router.get("/wallets/{user_id}")
def get_wallet(user_id: str):
    wallet = wallet_service.get_wallet(user_id)
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    return {"id": wallet.id, "user_id": wallet.user_id, "balance": wallet.balance}


@router.get("/runs")
def list_runs():
    runs = runs_service.list_runs()
    return [{"id": run.id, "name": run.name, "entry_fee": run.entry_fee} for run in runs]


@router.post("/runs/{creator_id}")
def create_run(creator_id: str, payload: CreateRunRequest):
    try:
        run = runs_service.create_run(creator_id, payload.model_dump(mode="json"))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"id": run.id, "name": run.name}


@router.post("/runs/{run_id}/join")
def join_run(run_id: str, payload: JoinRunRequest):
    try:
        run = runs_service.join_run(payload.user_id, run_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"id": run.id, "participants_updated": True}


@router.post("/runs/{run_id}/picks")
def make_pick(run_id: str, payload: MakePickRequest):
    try:
        pick = picks_service.make_pick(payload.user_id, run_id, payload.prediction, payload.amount)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"id": pick.id, "odds": pick.odds}


@router.post("/runs/{run_id}/results")
def post_results(run_id: str, payload: PostResultsRequest):
    try:
        result = results_service.post_results(payload.actor_id, run_id, payload.winner_id, payload.times)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return result
