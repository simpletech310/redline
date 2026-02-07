from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.models import RunORM, RunParticipantORM


class RunsRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, **kwargs) -> RunORM:
        run = RunORM(**kwargs)
        self.session.add(run)
        self.session.flush()
        return run

    def list_open(self) -> list[RunORM]:
        return list(self.session.scalars(select(RunORM).where(RunORM.results_posted.is_(False))))

    def get_by_id(self, run_id: str) -> RunORM | None:
        return self.session.get(RunORM, run_id)

    def add_participant(self, run_id: str, user_id: str) -> RunParticipantORM:
        participant = RunParticipantORM(run_id=run_id, user_id=user_id)
        self.session.add(participant)
        return participant

    def participants(self, run_id: str) -> list[RunParticipantORM]:
        return list(self.session.scalars(select(RunParticipantORM).where(RunParticipantORM.run_id == run_id)))

    def participant_exists(self, run_id: str, user_id: str) -> bool:
        return self.session.scalar(
            select(RunParticipantORM).where(RunParticipantORM.run_id == run_id, RunParticipantORM.user_id == user_id)
        ) is not None

    @staticmethod
    def parse_datetime(date_time: str) -> datetime:
        return datetime.fromisoformat(date_time)
