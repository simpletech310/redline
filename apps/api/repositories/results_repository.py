from sqlalchemy.orm import Session

from apps.api.models import ResultSnapshotORM


class ResultsRepository:
    def __init__(self, session: Session):
        self.session = session

    def create_snapshot(self, run_id: str, winner_id: str, times: dict, payout: float) -> ResultSnapshotORM:
        snapshot = ResultSnapshotORM(run_id=run_id, winner_id=winner_id, times=times, payout=payout)
        self.session.add(snapshot)
        self.session.flush()
        return snapshot
