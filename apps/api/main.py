from fastapi import FastAPI

from apps.api.api.routes import router
from apps.api.core.config import settings
from apps.api.db.base import Base
from apps.api.db.session import engine

app = FastAPI(title=settings.app_name)
app.include_router(router)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
