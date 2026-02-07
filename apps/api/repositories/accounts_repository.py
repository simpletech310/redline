from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.models import UserORM


class AccountsRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_id(self, user_id: str) -> UserORM | None:
        return self.session.get(UserORM, user_id)

    def get_by_username(self, username: str) -> UserORM | None:
        return self.session.scalar(select(UserORM).where(UserORM.username == username))

    def create(self, username: str, email: str, account_type):
        user = UserORM(username=username, email=email, account_type=account_type)
        self.session.add(user)
        self.session.flush()
        return user
