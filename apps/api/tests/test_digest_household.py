"""Household / per-pet digest builders + scheduler job keys."""

from types import SimpleNamespace

from app.services.email_svc import build_digest_content, build_household_digest_content
from app.services.scheduler import split_job


def _cfg(**overrides):
    base = dict(
        digest_show_handle=True,
        digest_show_feed=True,
        digest_show_maint=True,
        digest_show_shed=True,
        digest_show_activity=True,
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _overview(name: str, aid: int = 1) -> dict:
    return {
        "id": aid,
        "name": name,
        "clear_to_handle": {"ready": True, "message": f"{name} clear"},
        "next_feed": {"due_date": "2026-08-10", "countdown": "in 2 days", "prep_note": None},
        "next_maintenance": {"label": "Water", "due_date": "2026-08-09", "days_until": 1},
        "shed_mode": {"active": False},
        "last_shed": None,
        "handling_gap": None,
    }


def test_build_single_pet_digest():
    subject, html, text = build_digest_content(_overview("Casper"), _cfg(), ["Feed 2026-08-08: rat"])
    assert "Casper care digest" in subject
    assert "Casper" in html
    assert "CLEAR TO HANDLE" in html
    assert "Feed 2026-08-08" in text


def test_build_household_digest_both_pets():
    pets = [
        (_overview("Casper", 1), ["Feed today"], _cfg()),
        (_overview("Arlo", 2), ["Handling today"], _cfg()),
    ]
    subject, html, text = build_household_digest_content(pets)
    assert "Casper & Arlo care digest" in subject
    assert "Household digest" in html
    assert "Casper" in html and "Arlo" in html
    assert "Feed today" in text and "Handling today" in text
    assert "---" in text


def test_split_job_digest_and_animal():
    assert split_job("digest_am") == ("digest_am", None)
    assert split_job("digest_pm") == ("digest_pm", None)
    assert split_job("feed_overdue:2") == ("feed_overdue", 2)
    assert split_job("maint_water:1") == ("maint_water", 1)
    assert split_job("handle_cleared:1") == ("handle_cleared", 1)
