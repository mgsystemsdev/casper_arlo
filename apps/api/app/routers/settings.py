from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.config import get_settings
from app.db import get_db
from app.deps import AnimalId
from app.schemas import AppSettingsUpdate
from app.services.email_svc import preview_digest, run_tick, send_digest
from app.services.scheduler import request_reschedule
from app.services.settings_svc import settings_to_dict, update_settings

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings")
def get_settings_api(aid: AnimalId, _: None = Depends(require_auth), db: Session = Depends(get_db)):
    return settings_to_dict(db, aid)


@router.put("/settings")
def put_settings(
    body: AppSettingsUpdate,
    aid: AnimalId,
    _: None = Depends(require_auth),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    result = update_settings(db, aid, data)
    request_reschedule()
    return result


@router.get("/settings/digest-today")
def digest_today(_: None = Depends(require_auth), db: Session = Depends(get_db)):
    """Preview of what today's digest email would contain (no send)."""
    return preview_digest(db)


@router.post("/settings/test-digest")
def test_digest(_: None = Depends(require_auth), db: Session = Depends(get_db)):
    return send_digest(db, force=True, slot="am")


@router.post("/internal/tick")
def internal_tick(
    db: Session = Depends(get_db),
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    expected = get_settings().cron_secret
    if not expected or x_cron_secret != expected:
        raise HTTPException(401, "Invalid cron secret")
    return run_tick(db)
