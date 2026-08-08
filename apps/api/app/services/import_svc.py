"""Import care logs from archive/legacy-dashboard.html localStorage dumps."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Feed, ShedCycle, ShedStatus, TailEvent, VetVisit, Weight
from app.services.care import list_animals
from app.services.scheduler import request_reschedule


def resolve_legacy_animals(db: Session) -> dict[str, int]:
    """Map casper/arlo keys to animal ids by name, then species heuristics."""
    animals = list_animals(db)
    by_name = {a.name.strip().lower(): a for a in animals}
    out: dict[str, int] = {}

    casper = by_name.get("casper")
    if casper is None:
        casper = next((a for a in animals if "regius" in (a.species or "").lower()), None)
    if casper is not None:
        out["casper"] = casper.id

    arlo = by_name.get("arlo")
    if arlo is None:
        arlo = next(
            (
                a
                for a in animals
                if "ciliatus" in (a.species or "").lower() or "crest" in (a.common_name or "").lower()
            ),
            None,
        )
    if arlo is not None:
        out["arlo"] = arlo.id

    return out


def _parse_date(raw: Any) -> date | None:
    if raw is None or raw == "":
        return None
    try:
        return date.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


def _feed_accepted(f: dict) -> bool:
    if "accept" in f:
        return str(f.get("accept", "yes")).lower() in ("yes", "y", "true", "1")
    return bool(f.get("accepted", True))


def _existing_feed_keys(db: Session, animal_id: int) -> set[tuple]:
    rows = db.scalars(select(Feed).where(Feed.animal_id == animal_id))
    return {(r.date, r.prey_type, r.accepted) for r in rows}


def _existing_weight_keys(db: Session, animal_id: int) -> set[tuple]:
    rows = db.scalars(select(Weight).where(Weight.animal_id == animal_id))
    return {(r.date, round(float(r.weight_g), 2)) for r in rows}


def _existing_shed_keys(db: Session, animal_id: int) -> set[tuple]:
    rows = db.scalars(select(ShedCycle).where(ShedCycle.animal_id == animal_id))
    return {(r.started_at, r.quality or "", r.eyes or "") for r in rows}


def _existing_vet_keys(db: Session, animal_id: int) -> set[tuple]:
    rows = db.scalars(select(VetVisit).where(VetVisit.animal_id == animal_id))
    return {(r.date, r.reason) for r in rows}


def _existing_tail_keys(db: Session, animal_id: int) -> set[tuple]:
    rows = db.scalars(select(TailEvent).where(TailEvent.animal_id == animal_id))
    return {(r.date, r.cause) for r in rows}


def import_pet_payload(
    db: Session,
    animal_id: int,
    payload: dict[str, Any],
    *,
    skip_duplicates: bool = True,
) -> dict[str, int]:
    """Import one pet's legacy arrays. Returns counts of newly inserted rows."""
    feeds = list(payload.get("feeds") or [])
    weights = list(payload.get("weights") or [])
    sheds = list(payload.get("sheds") or [])
    vet = list(payload.get("vet") or [])
    tails = list(payload.get("tails") or [])

    count = {"feeds": 0, "weights": 0, "sheds": 0, "vet": 0, "tails": 0, "skipped": 0}

    feed_keys = _existing_feed_keys(db, animal_id) if skip_duplicates else set()
    weight_keys = _existing_weight_keys(db, animal_id) if skip_duplicates else set()
    shed_keys = _existing_shed_keys(db, animal_id) if skip_duplicates else set()
    vet_keys = _existing_vet_keys(db, animal_id) if skip_duplicates else set()
    tail_keys = _existing_tail_keys(db, animal_id) if skip_duplicates else set()

    for f in feeds:
        d = _parse_date(f.get("date"))
        if d is None:
            count["skipped"] += 1
            continue
        prey = f.get("prey") or f.get("prey_type") or "Unknown"
        accepted = _feed_accepted(f)
        key = (d, prey, accepted)
        if skip_duplicates and key in feed_keys:
            count["skipped"] += 1
            continue
        weight = f.get("weight") if f.get("weight") not in (None, "") else f.get("snake_weight_g")
        snake_w = float(weight) if weight not in (None, "") else None
        db.add(
            Feed(
                animal_id=animal_id,
                date=d,
                prey_type=str(prey),
                prey_weight_g=f.get("prey_weight_g"),
                accepted=accepted,
                snake_weight_g=snake_w,
                notes=f.get("notes") or "",
            )
        )
        feed_keys.add(key)
        count["feeds"] += 1
        if snake_w is not None:
            wkey = (d, round(snake_w, 2))
            if not skip_duplicates or wkey not in weight_keys:
                db.add(Weight(animal_id=animal_id, date=d, weight_g=snake_w))
                weight_keys.add(wkey)
                count["weights"] += 1

    for w in weights:
        d = _parse_date(w.get("date"))
        if d is None:
            count["skipped"] += 1
            continue
        try:
            wg = float(w["weight"] if "weight" in w else w["weight_g"])
        except (KeyError, TypeError, ValueError):
            count["skipped"] += 1
            continue
        key = (d, round(wg, 2))
        if skip_duplicates and key in weight_keys:
            count["skipped"] += 1
            continue
        db.add(Weight(animal_id=animal_id, date=d, weight_g=wg))
        weight_keys.add(key)
        count["weights"] += 1

    for s in sheds:
        d = _parse_date(s.get("date"))
        if d is None:
            count["skipped"] += 1
            continue
        quality = s.get("quality")
        eyes = s.get("eyes") or s.get("toes")
        key = (d, quality or "", eyes or "")
        if skip_duplicates and key in shed_keys:
            count["skipped"] += 1
            continue
        db.add(
            ShedCycle(
                animal_id=animal_id,
                status=ShedStatus.shed,
                started_at=d,
                completed_at=d,
                quality=quality,
                eyes=eyes,
                notes="",
            )
        )
        shed_keys.add(key)
        count["sheds"] += 1

    for v in vet:
        d = _parse_date(v.get("date"))
        if d is None:
            count["skipped"] += 1
            continue
        reason = v.get("reason") or "Visit"
        key = (d, reason)
        if skip_duplicates and key in vet_keys:
            count["skipped"] += 1
            continue
        db.add(
            VetVisit(
                animal_id=animal_id,
                date=d,
                reason=reason,
                notes=v.get("notes") or "",
            )
        )
        vet_keys.add(key)
        count["vet"] += 1

    for t in tails:
        d = _parse_date(t.get("date"))
        if d is None:
            count["skipped"] += 1
            continue
        cause = t.get("cause") or "Unknown"
        key = (d, cause)
        if skip_duplicates and key in tail_keys:
            count["skipped"] += 1
            continue
        db.add(
            TailEvent(
                animal_id=animal_id,
                date=d,
                cause=cause,
                notes=t.get("notes") or "",
            )
        )
        tail_keys.add(key)
        count["tails"] += 1

    return count


def import_legacy_dashboard(
    db: Session,
    body: dict[str, Any],
    *,
    skip_duplicates: bool = True,
) -> dict[str, Any]:
    """Import casper + arlo payloads into matching animals."""
    targets = resolve_legacy_animals(db)
    if not targets:
        return {"ok": False, "error": "No animals seeded"}

    skip = body.get("skip_duplicates", skip_duplicates)
    if not isinstance(skip, bool):
        skip = skip_duplicates

    results: dict[str, Any] = {}
    for key in ("casper", "arlo"):
        if key not in targets:
            results[key] = {"ok": False, "skipped": "animal_not_found"}
            continue
        payload = body.get(key)
        if payload is None:
            results[key] = {"ok": True, "imported": None, "note": "no_payload"}
            continue
        if not isinstance(payload, dict):
            results[key] = {"ok": False, "error": "invalid_payload"}
            continue
        imported = import_pet_payload(db, targets[key], payload, skip_duplicates=skip)
        results[key] = {"ok": True, "animal_id": targets[key], "imported": imported}

    db.commit()
    request_reschedule()
    return {"ok": True, "skip_duplicates": skip, "targets": targets, "results": results}
