"""Legacy dashboard household import."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.db import SessionLocal
from app.main import app
from app.models import Feed, ShedCycle, TailEvent, VetVisit, Weight
from app.services.import_svc import import_legacy_dashboard, import_pet_payload, resolve_legacy_animals


MARKER_DATE = date(2099, 1, 15)


def _cleanup(db, animal_ids: list[int]) -> None:
    for model in (Feed, Weight, VetVisit, TailEvent):
        db.execute(delete(model).where(model.animal_id.in_(animal_ids), model.date >= MARKER_DATE))
    db.execute(
        delete(ShedCycle).where(ShedCycle.animal_id.in_(animal_ids), ShedCycle.started_at >= MARKER_DATE)
    )
    db.commit()


def test_resolve_and_household_import():
    db = SessionLocal()
    try:
        targets = resolve_legacy_animals(db)
        assert "casper" in targets and "arlo" in targets
        ids = [targets["casper"], targets["arlo"]]
        _cleanup(db, ids)

        result = import_legacy_dashboard(
            db,
            {
                "casper": {
                    "feeds": [
                        {
                            "date": MARKER_DATE.isoformat(),
                            "prey": "Rat pup",
                            "accept": "yes",
                            "weight": "120",
                        }
                    ],
                    "weights": [{"date": "2099-01-16", "weight": 125}],
                    "sheds": [{"date": "2099-01-17", "quality": "complete", "eyes": "clear"}],
                    "vet": [{"date": "2099-01-18", "reason": "Checkup", "notes": "ok"}],
                },
                "arlo": {
                    "feeds": [
                        {
                            "date": MARKER_DATE.isoformat(),
                            "prey": "CGD",
                            "accept": "yes",
                            "weight": "18.5",
                        }
                    ],
                    "weights": [],
                    "sheds": [{"date": "2099-01-17", "quality": "complete", "toes": "clear"}],
                    "vet": [],
                    "tails": [{"date": "2099-01-19", "cause": "Stress"}],
                },
                "skip_duplicates": True,
            },
        )
        assert result["ok"] is True
        assert result["results"]["casper"]["imported"]["feeds"] == 1
        assert result["results"]["arlo"]["imported"]["tails"] == 1
        assert result["results"]["arlo"]["imported"]["sheds"] == 1

        # Dedupe second pass
        again = import_pet_payload(
            db,
            targets["casper"],
            {
                "feeds": [
                    {
                        "date": MARKER_DATE.isoformat(),
                        "prey": "Rat pup",
                        "accept": "yes",
                        "weight": "120",
                    }
                ],
                "weights": [],
                "sheds": [],
                "vet": [],
                "tails": [],
            },
            skip_duplicates=True,
        )
        db.commit()
        assert again["feeds"] == 0
        assert again["skipped"] >= 1

        from sqlalchemy import select

        feeds = list(
            db.scalars(select(Feed).where(Feed.animal_id == targets["casper"], Feed.date == MARKER_DATE))
        )
        assert len(feeds) == 1
        tails = list(db.scalars(select(TailEvent).where(TailEvent.animal_id == targets["arlo"])))
        assert any(t.cause == "Stress" and t.date == date(2099, 1, 19) for t in tails)
    finally:
        try:
            targets = resolve_legacy_animals(db)
            _cleanup(db, list(targets.values()))
        finally:
            db.close()


def test_import_legacy_api_endpoint():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"password": "casper"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        targets = resolve_legacy_animals(db)
        _cleanup(db, list(targets.values()))
    finally:
        db.close()

    res = client.post(
        "/api/import/legacy",
        headers=headers,
        json={
            "version": 1,
            "source": "legacy-dashboard",
            "skip_duplicates": True,
            "casper": {
                "feeds": [{"date": "2099-01-20", "prey": "API Rat", "accept": "yes"}],
                "weights": [],
                "sheds": [],
                "vet": [],
            },
            "arlo": {
                "feeds": [],
                "weights": [{"date": "2099-01-20", "weight": 19}],
                "sheds": [],
                "vet": [],
                "tails": [],
            },
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is True
    assert body["results"]["casper"]["imported"]["feeds"] == 1
    assert body["results"]["arlo"]["imported"]["weights"] == 1

    db = SessionLocal()
    try:
        _cleanup(db, list(resolve_legacy_animals(db).values()))
    finally:
        db.close()
