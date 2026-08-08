"""App-wide email settings + per-animal care settings."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Animal, AnimalCareSettings, AppSettings
from app.services.species_packs import resolve_species_key

# Household / Resend — one row
GLOBAL_DEFAULTS: dict[str, Any] = {
    "email_enabled": False,
    "reminder_email": "",
    "timezone": "America/Chicago",
    "digest_enabled": False,
    "digest_time_1": "08:00",
    "digest_time_2": "20:00",
    "digest_second_enabled": True,
    "digest_mode": "household",
}

# Ball python (Casper) care defaults
CARE_DEFAULTS_BALL_PYTHON: dict[str, Any] = {
    "feed_ready_days": 2,
    "handle_clear_hours": 72,
    "handling_max_gap_days": 2,
    "maint_water_days": 3,
    "maint_substrate_days": 30,
    "maint_deep_clean_days": 90,
    "feed_interval_mode": "auto",
    "feed_interval_days": None,
    "event_handle_cleared": True,
    "event_feed_overdue": True,
    "event_handling_gap": False,
    "event_shed_status": True,
    "event_regurg": True,
    "event_maint_water": True,
    "event_maint_substrate": True,
    "event_maint_deep_clean": True,
    "event_weight_due": True,
    "event_tail_drop": False,
    "weight_log_interval_days": 7,
    "digest_show_feed": True,
    "digest_show_maint": True,
    "digest_show_shed": True,
    "digest_show_handle": True,
    "digest_show_activity": True,
    "digest_show_tail": False,
}

# Crested gecko (Arlo) care defaults
CARE_DEFAULTS_CRESTED: dict[str, Any] = {
    "feed_ready_days": 1,
    "handle_clear_hours": 12,
    "handling_max_gap_days": 2,
    "maint_water_days": 3,
    "maint_substrate_days": 2,
    "maint_deep_clean_days": 90,
    "feed_interval_mode": "auto",
    "feed_interval_days": None,
    "event_handle_cleared": True,
    "event_feed_overdue": True,
    "event_handling_gap": False,
    "event_shed_status": True,
    "event_regurg": False,
    "event_maint_water": True,
    "event_maint_substrate": True,
    "event_maint_deep_clean": True,
    "event_weight_due": True,
    "event_tail_drop": True,
    "weight_log_interval_days": 7,
    "digest_show_feed": True,
    "digest_show_maint": True,
    "digest_show_shed": True,
    "digest_show_handle": True,
    "digest_show_activity": True,
    "digest_show_tail": True,
}

# Backward-compat alias used by tests / callers that expect flat DEFAULTS
DEFAULTS: dict[str, Any] = {**GLOBAL_DEFAULTS, **CARE_DEFAULTS_BALL_PYTHON}

CARE_KEYS = tuple(CARE_DEFAULTS_BALL_PYTHON.keys())
GLOBAL_KEYS = tuple(GLOBAL_DEFAULTS.keys())


def care_defaults_for_pack(pack_key: str) -> dict[str, Any]:
    if pack_key == "crested_gecko":
        return dict(CARE_DEFAULTS_CRESTED)
    return dict(CARE_DEFAULTS_BALL_PYTHON)


def get_or_create_settings(db: Session) -> AppSettings:
    """Global email / digest schedule row (id=1)."""
    row = db.get(AppSettings, 1)
    if row is None:
        # Only persist global columns; care columns may still exist on the model
        kwargs = {k: GLOBAL_DEFAULTS[k] for k in GLOBAL_DEFAULTS}
        # Fill legacy care columns with ball-python defaults if still present on model
        for k, v in CARE_DEFAULTS_BALL_PYTHON.items():
            if hasattr(AppSettings, k):
                kwargs[k] = v
        row = AppSettings(id=1, **kwargs)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _pack_key_for_animal(db: Session, animal_id: int) -> str:
    animal = db.get(Animal, animal_id)
    if animal is None:
        return "ball_python"
    return resolve_species_key(animal.species, animal.name)


def get_or_create_care_settings(db: Session, animal_id: int) -> AnimalCareSettings:
    row = db.scalar(select(AnimalCareSettings).where(AnimalCareSettings.animal_id == animal_id))
    if row is not None:
        return row

    pack_key = _pack_key_for_animal(db, animal_id)
    defaults = care_defaults_for_pack(pack_key)

    # Seed from legacy app_settings care columns when present (one-time bridge)
    global_row = get_or_create_settings(db)
    seeded = dict(defaults)
    for key in CARE_KEYS:
        if key in ("event_tail_drop", "digest_show_tail"):
            continue  # species-specific; keep pack defaults
        if hasattr(global_row, key):
            val = getattr(global_row, key)
            if val is not None:
                seeded[key] = val
    # Crested: don't inherit snake handle wait / regurg from global leftovers
    if pack_key == "crested_gecko":
        for key in ("handle_clear_hours", "feed_ready_days", "maint_substrate_days", "event_regurg"):
            seeded[key] = defaults[key]
        seeded["event_tail_drop"] = defaults["event_tail_drop"]
        seeded["digest_show_tail"] = defaults["digest_show_tail"]

    row = AnimalCareSettings(animal_id=animal_id, **seeded)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_merged_settings(db: Session, animal_id: int) -> SimpleNamespace:
    """Namespace with global email fields + this animal's care fields."""
    global_row = get_or_create_settings(db)
    care = get_or_create_care_settings(db, animal_id)
    data: dict[str, Any] = {k: getattr(global_row, k) for k in GLOBAL_KEYS}
    for k in CARE_KEYS:
        data[k] = getattr(care, k)
    data["animal_id"] = animal_id
    return SimpleNamespace(**data)


def settings_to_dict(db: Session, animal_id: int) -> dict[str, Any]:
    merged = get_merged_settings(db, animal_id)
    out = {k: getattr(merged, k) for k in (*GLOBAL_KEYS, *CARE_KEYS)}
    out["animal_id"] = animal_id
    out["species_key"] = _pack_key_for_animal(db, animal_id)
    return out


def update_settings(db: Session, animal_id: int, data: dict) -> dict[str, Any]:
    global_row = get_or_create_settings(db)
    care = get_or_create_care_settings(db, animal_id)

    for key in GLOBAL_KEYS:
        if key not in data:
            continue
        val = data[key]
        if key in ("digest_time_1", "digest_time_2") and isinstance(val, str) and len(val) >= 5:
            val = val[:5]
        if key == "digest_mode" and val not in ("household", "per_pet"):
            continue
        setattr(global_row, key, val)

    for key in CARE_KEYS:
        if key not in data:
            continue
        setattr(care, key, data[key])

    db.commit()
    db.refresh(global_row)
    db.refresh(care)
    return settings_to_dict(db, animal_id)
