from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.models import PickORM


class PicksRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, **kwargs) -> PickORM:
        pick = PickORM(**kwargs)
        self.session.add(pick)
        self.session.flush()
        return pick

    def list_by_run(self, run_id: str) -> list[PickORM]:
        return list(self.session.scalars(select(PickORM).where(PickORM.run_id == run_id)))
