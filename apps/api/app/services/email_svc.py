from datetime import date, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import EmailSendLog, Feed, Handling, Maintenance, Regurgitation
from app.services.care import build_overview, days_countdown_label, get_animal, list_animals, local_now
from app.services.settings_svc import get_merged_settings, get_or_create_settings


def already_sent(db: Session, dedupe_key: str) -> bool:
    return db.scalar(select(EmailSendLog).where(EmailSendLog.dedupe_key == dedupe_key)) is not None


def record_sent(db: Session, kind: str, dedupe_key: str) -> None:
    if already_sent(db, dedupe_key):
        return
    db.add(EmailSendLog(kind=kind, dedupe_key=dedupe_key))
    db.commit()


def send_resend(to: str, subject: str, html: str, text: str) -> dict[str, Any]:
    cfg = get_settings()
    if not cfg.resend_api_key:
        return {"ok": False, "error": "RESEND_API_KEY not configured"}
    if not to:
        return {"ok": False, "error": "No reminder_email configured"}
    payload = {
        "from": cfg.resend_from,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    with httpx.Client(timeout=20.0) as client:
        res = client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {cfg.resend_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if res.status_code >= 400:
        return {"ok": False, "error": res.text, "status": res.status_code}
    return {"ok": True, "data": res.json()}


def _section(title: str, body: str) -> str:
    return (
        f"<h2 style='color:#C4946A;font-size:14px;margin:20px 0 8px;font-family:monospace'>"
        f"{title}</h2><p style='margin:0;color:#F2E8D9;line-height:1.5'>{body}</p>"
    )


def _pet_digest_parts(overview: dict[str, Any], cfg, recent: list[str]) -> tuple[list[str], list[str]]:
    """HTML/text section blocks for one pet (no outer wrapper)."""
    name = overview.get("name", "Pet")
    handle = overview["clear_to_handle"]
    feed = overview.get("next_feed")
    maint = overview.get("next_maintenance")
    shed = overview.get("shed_mode")
    last_shed = overview.get("last_shed")
    gap = overview.get("handling_gap")
    pack = overview.get("species_pack") or {}
    is_crestie = pack.get("key") == "crested_gecko"
    feed_label = "Next meal" if is_crestie else "Next feed"

    html_parts: list[str] = [
        f"<h1 style='font-family:Georgia,serif;color:#F2E8D9;font-size:22px;margin:0 0 8px'>{name}</h1>",
    ]
    text_parts: list[str] = [f"{name}", ""]

    if cfg.digest_show_handle:
        h = handle["message"]
        clear_label = "CLEAR TO HANDLE" if handle["ready"] else "WAIT TO HANDLE"
        if handle["ready"]:
            block = f"<strong style='color:#8FA669'>{clear_label}</strong><br/>{h}"
        else:
            block = f"<strong style='color:#D4A040'>{clear_label}</strong><br/>{h}"
        html_parts.append(
            "<div style='border:1px solid #C4946A;border-radius:10px;padding:14px;background:#2C201A;margin:12px 0'>"
            + block
            + "</div>"
        )
        text_parts.append(clear_label)
        text_parts.append(h)
        text_parts.append("")

    if cfg.digest_show_feed:
        if feed:
            line = f"{feed_label}: {feed['due_date']} — {feed['countdown']}"
            if feed.get("prep_note"):
                line += f" · {feed['prep_note']}"
        else:
            line = f"{feed_label}: no meals logged yet" if is_crestie else "Next feed: no feeds logged yet"
        html_parts.append(_section(feed_label, line))
        text_parts.append(line)

    if cfg.digest_show_maint:
        if maint:
            line = f"{maint['label']}: {maint['due_date']} — {days_countdown_label(maint['days_until'])}"
        else:
            line = "Maintenance: —"
        html_parts.append(_section("Next maintenance", line))
        text_parts.append(line)

    if gap:
        html_parts.append(_section("Handling", gap["countdown"]))
        text_parts.append(f"Handling: {gap['countdown']}")

    if cfg.digest_show_shed:
        if shed and shed["active"]:
            line = f"In shed ({shed['status']}) — humidity {shed['humidity_target']}"
            if shed.get("dont_feed"):
                line += " · do not feed while opaque"
        elif last_shed:
            line = f"Last shed: {last_shed['date']}" + (
                f" ({last_shed['quality']})" if last_shed.get("quality") else ""
            )
        else:
            line = "Last shed: none logged"
        html_parts.append(_section("Shed", line))
        text_parts.append(f"Shed: {line}")

    if getattr(cfg, "digest_show_tail", False) and pack.get("supports_tail"):
        tail = overview.get("tail_status") or {}
        last_tail = overview.get("last_tail")
        if tail.get("intact", True):
            line = "Tail intact"
        elif last_tail:
            line = f"Tail dropped {last_tail.get('date', '')}" + (
                f" · {last_tail['cause']}" if last_tail.get("cause") else ""
            )
        else:
            line = "Tail not intact"
        html_parts.append(_section("Tail", line))
        text_parts.append(f"Tail: {line}")

    if cfg.digest_show_activity and recent:
        html_parts.append(_section("Since last digest", "<br/>".join(recent)))
        text_parts.append("Since last digest:")
        text_parts.extend(f"- {r}" for r in recent)

    return html_parts, text_parts


def build_digest_content(overview: dict[str, Any], cfg, recent: list[str]) -> tuple[str, str, str]:
    name = overview.get("name", "Casper")
    subject = f"{name} care digest — {date.today().isoformat()}"
    html_inner, text_parts = _pet_digest_parts(overview, cfg, recent)
    html = (
        "<div style='background:#1a0e08;padding:24px;font-family:Lato,sans-serif;color:#F2E8D9'>"
        + "\n".join(html_inner)
        + "</div>"
    )
    return subject, html, "\n".join(text_parts)


def build_household_digest_content(
    pets: list[tuple[dict[str, Any], list[str], Any]],
) -> tuple[str, str, str]:
    names = [p[0].get("name", "Pet") for p in pets]
    if len(names) >= 2:
        title = f"{names[0]} & {names[1]}" if len(names) == 2 else " · ".join(names)
    elif names:
        title = names[0]
    else:
        title = "Household"
    subject = f"{title} care digest — {date.today().isoformat()}"

    html_parts = [
        "<div style='background:#1a0e08;padding:24px;font-family:Lato,sans-serif;color:#F2E8D9'>",
        f"<h1 style='font-family:Georgia,serif;color:#F2E8D9;margin:0 0 4px'>{title} — daily care</h1>",
        "<p style='color:#C4946A;font-size:12px;margin:0 0 20px'>Household digest</p>",
    ]
    text_parts = [f"{title} — daily care", ""]

    for i, (overview, recent, pet_cfg) in enumerate(pets):
        if i > 0:
            html_parts.append("<hr style='border:none;border-top:1px solid #4a3020;margin:28px 0'/>")
            text_parts.append("")
            text_parts.append("---")
            text_parts.append("")
        pet_html, pet_text = _pet_digest_parts(overview, pet_cfg, recent)
        html_parts.extend(pet_html)
        text_parts.extend(pet_text)

    html_parts.append("</div>")
    return subject, "\n".join(html_parts), "\n".join(text_parts)


def recent_activity(db: Session, since: datetime, animal_id: int | None = None) -> list[str]:
    animal = get_animal(db, animal_id)
    if animal is None:
        return []
    aid = animal.id
    lines: list[str] = []
    since_date = since.date() if isinstance(since, datetime) else since

    for f in db.scalars(select(Feed).where(Feed.animal_id == aid, Feed.date >= since_date).limit(10)):
        lines.append(f"Feed {f.date}: {f.prey_type} ({'accepted' if f.accepted else 'refused'})")
    for h in db.scalars(select(Handling).where(Handling.animal_id == aid, Handling.date >= since_date).limit(10)):
        lines.append(f"Handling {h.date}: {h.duration_min}min · {h.temperament.value}")
    for m in db.scalars(
        select(Maintenance).where(Maintenance.animal_id == aid, Maintenance.date >= since_date).limit(10)
    ):
        lines.append(f"Maintenance {m.date}: {m.kind.value}")
    for r in db.scalars(
        select(Regurgitation).where(Regurgitation.animal_id == aid, Regurgitation.date >= since_date).limit(5)
    ):
        lines.append(f"REGURG {r.date}: {r.severity}")
    return lines[:15]


def _digest_slot(cfg, now: datetime, slot: str | None) -> tuple[str | None, str | None]:
    """Return (slot, skipped_reason). skipped_reason set when not a digest window."""
    hhmm = now.strftime("%H:%M")
    if slot is None:
        if hhmm == cfg.digest_time_1:
            return "am", None
        if cfg.digest_second_enabled and hhmm == cfg.digest_time_2:
            return "pm", None
        return None, "not_digest_time"
    return slot, None


def _collect_pet_digests(db: Session, since: datetime) -> list[tuple[dict[str, Any], list[str], Any]]:
    pets: list[tuple[dict[str, Any], list[str], Any]] = []
    for animal in list_animals(db):
        pets.append(
            (
                build_overview(db, animal.id),
                recent_activity(db, since, animal.id),
                get_merged_settings(db, animal.id),
            )
        )
    return pets


def preview_digest(db: Session) -> dict[str, Any]:
    """Same payload the digest email would send today — no send, no dedupe."""
    cfg = get_or_create_settings(db)
    now = local_now(cfg)
    since = now - timedelta(hours=14)
    pets = _collect_pet_digests(db, since)
    mode = getattr(cfg, "digest_mode", None) or "household"

    if mode == "per_pet" and pets:
        # Mirror send path: one email body per pet, stacked for PDF preview.
        html_blocks: list[str] = []
        text_blocks: list[str] = []
        names: list[str] = []
        for overview, recent, pet_cfg in pets:
            subj, html, text = build_digest_content(overview, pet_cfg, recent)
            name = overview.get("name") or "Pet"
            names.append(name)
            html_blocks.append(
                f"<p style='color:#C4946A;font-size:12px;font-family:monospace;margin:0 0 8px'>"
                f"Separate email — {subj}</p>{html}"
            )
            text_blocks.append(f"=== {subj} ===\n{text}")
        title = " & ".join(names) if len(names) <= 2 else " · ".join(names)
        subject = f"{title} care digests (per pet) — {date.today().isoformat()}"
        html = "\n<hr style='border:none;border-top:1px solid #4a3020;margin:28px 0'/>\n".join(html_blocks)
        text = "\n\n".join(text_blocks)
    else:
        subject, html, text = build_household_digest_content(pets)

    return {
        "ok": True,
        "date": now.date().isoformat(),
        "mode": mode,
        "pets": [p[0].get("name") for p in pets],
        "subject": subject,
        "html": html,
        "text": text,
        "to": cfg.reminder_email,
    }


def send_digest(db: Session, *, force: bool = False, slot: str | None = None) -> dict[str, Any]:
    cfg = get_or_create_settings(db)
    if not cfg.email_enabled and not force:
        return {"ok": False, "skipped": "email_disabled"}
    if not cfg.digest_enabled and not force:
        return {"ok": False, "skipped": "digest_disabled"}

    now = local_now(cfg)
    slot, skip = _digest_slot(cfg, now, slot)
    if skip:
        return {"ok": False, "skipped": skip, "now": now.strftime("%H:%M")}

    kind = f"digest_{slot}"
    slot_time = cfg.digest_time_1 if slot == "am" else cfg.digest_time_2
    since = now - timedelta(hours=14)
    pets = _collect_pet_digests(db, since)
    if not pets:
        return {"ok": False, "skipped": "no_animals"}

    mode = getattr(cfg, "digest_mode", None) or "household"

    if mode == "per_pet":
        results: list[dict[str, Any]] = []
        any_ok = False
        for overview, recent, pet_cfg in pets:
            aid = overview["id"]
            name = overview.get("name", "Pet")
            dedupe = f"digest:{aid}:{now.date().isoformat()}:{slot_time}"
            if not force and already_sent(db, dedupe):
                results.append({"ok": False, "skipped": "already_sent", "animal_id": aid, "dedupe_key": dedupe})
                continue
            subject, html, text = build_digest_content(overview, pet_cfg, recent)
            result = send_resend(cfg.reminder_email, subject, html, text)
            if result.get("ok"):
                record_sent(db, kind, dedupe)
                any_ok = True
            results.append({**result, "animal_id": aid, "name": name, "dedupe_key": dedupe})
        return {"ok": any_ok, "kind": kind, "mode": "per_pet", "results": results}

    dedupe = f"digest:household:{now.date().isoformat()}:{slot_time}"
    if not force and already_sent(db, dedupe):
        return {"ok": False, "skipped": "already_sent", "dedupe_key": dedupe, "mode": "household"}

    subject, html, text = build_household_digest_content(pets)
    result = send_resend(cfg.reminder_email, subject, html, text)
    if result.get("ok"):
        record_sent(db, kind, dedupe)
    return {**result, "kind": kind, "dedupe_key": dedupe, "mode": "household", "pets": [p[0].get("name") for p in pets]}


def send_event_email(
    db: Session,
    kind: str,
    subject: str,
    body: str,
    dedupe_key: str,
    *,
    animal_id: int | None = None,
) -> dict[str, Any]:
    global_cfg = get_or_create_settings(db)
    if not global_cfg.email_enabled:
        return {"ok": False, "skipped": "email_disabled"}

    if animal_id is not None:
        cfg = get_merged_settings(db, animal_id)
    else:
        cfg = global_cfg

    toggle = {
        "handle_cleared": getattr(cfg, "event_handle_cleared", True),
        "feed_overdue": getattr(cfg, "event_feed_overdue", True),
        "handling_gap": getattr(cfg, "event_handling_gap", False),
        "shed_status": getattr(cfg, "event_shed_status", True),
        "regurg": getattr(cfg, "event_regurg", True),
        "maint_water": getattr(cfg, "event_maint_water", True),
        "maint_substrate": getattr(cfg, "event_maint_substrate", True),
        "maint_deep_clean": getattr(cfg, "event_maint_deep_clean", True),
        "weight_due": getattr(cfg, "event_weight_due", True),
        "tail_drop": getattr(cfg, "event_tail_drop", False),
    }.get(kind, True)
    if not toggle:
        return {"ok": False, "skipped": "event_disabled"}
    if already_sent(db, dedupe_key):
        return {"ok": False, "skipped": "already_sent"}

    html = (
        f"<div style='background:#1a0e08;padding:20px;color:#F2E8D9;font-family:sans-serif'>"
        f"<h2 style='color:#C4946A'>{subject}</h2><p>{body}</p></div>"
    )
    result = send_resend(global_cfg.reminder_email, subject, html, body)
    if result.get("ok"):
        record_sent(db, kind, dedupe_key)
    return result


def fire_handle_cleared(db: Session, animal_id: int | None = None) -> dict[str, Any]:
    overview = build_overview(db, animal_id)
    handle = overview["clear_to_handle"]
    last_feed = overview.get("last_feed")
    if not handle.get("ready"):
        return {"ok": False, "skipped": "not_ready"}
    if not last_feed or not last_feed.get("accepted"):
        return {"ok": False, "skipped": "no_accepted_feed"}
    if not handle.get("clear_at"):
        return {"ok": False, "skipped": "no_timer"}
    name = overview.get("name", "Pet")
    aid = overview["id"]
    return send_event_email(
        db,
        "handle_cleared",
        f"{name}: clear to handle",
        "It is now clear to handle — post-feed wait is over.",
        f"handle_cleared:{aid}:feed-{last_feed['id']}",
        animal_id=aid,
    )


def fire_feed_overdue(db: Session, animal_id: int | None = None) -> dict[str, Any]:
    overview = build_overview(db, animal_id)
    feed = overview.get("next_feed")
    if not feed or feed.get("days_until", 0) >= 0:
        return {"ok": False, "skipped": "not_overdue"}
    name = overview.get("name", "Pet")
    aid = overview["id"]
    pack = overview.get("species_pack") or {}
    label = "meal" if pack.get("key") == "crested_gecko" else "feed"
    return send_event_email(
        db,
        "feed_overdue",
        f"{name}: {label} overdue",
        f"Next {label} was due {feed['due_date']} — {feed['countdown']}.",
        f"feed_overdue:{aid}:{feed['due_date']}",
        animal_id=aid,
    )


def fire_handling_gap(db: Session, animal_id: int | None = None) -> dict[str, Any]:
    overview = build_overview(db, animal_id)
    gap = overview.get("handling_gap")
    handle = overview["clear_to_handle"]
    if not gap or not gap.get("overdue") or not handle.get("ready"):
        return {"ok": False, "skipped": "not_due"}
    name = overview.get("name", "Pet")
    aid = overview["id"]
    return send_event_email(
        db,
        "handling_gap",
        f"{name}: handling due",
        gap["countdown"] + " — and it is clear to handle.",
        f"handling_gap:{aid}:{date.today().isoformat()}",
        animal_id=aid,
    )


def fire_maint_due(db: Session, kind: str, animal_id: int | None = None) -> dict[str, Any]:
    overview = build_overview(db, animal_id)
    item = next((i for i in (overview.get("maintenance_items") or []) if i["kind"] == kind), None)
    if item is None:
        return {"ok": False, "skipped": "unknown_kind"}
    if not item.get("overdue") and not item.get("due_today"):
        return {"ok": False, "skipped": "not_due"}
    name = overview.get("name", "Pet")
    aid = overview["id"]
    status = "overdue" if item.get("overdue") else "due today"
    event_kind = f"maint_{kind}"
    return send_event_email(
        db,
        event_kind,
        f"{name}: {item['label']} {status}",
        f"{item['label']} is {status} (due {item['due_date']}). "
        f"Interval every {item['interval_days']}d · last logged {item['last_date'] or 'never'}.",
        f"{event_kind}:{aid}:{item['due_date']}",
        animal_id=aid,
    )


def fire_weight_due(db: Session, animal_id: int | None = None) -> dict[str, Any]:
    overview = build_overview(db, animal_id)
    weight = overview.get("weight_due")
    if not weight or not weight.get("due"):
        return {"ok": False, "skipped": "not_due"}
    name = overview.get("name", "Pet")
    aid = overview["id"]
    return send_event_email(
        db,
        "weight_due",
        f"{name}: weight log due",
        weight["countdown"]
        + f" (every {weight['interval_days']}d · last {weight['last_date'] or 'never'}).",
        f"weight_due:{aid}:{weight['due_date']}",
        animal_id=aid,
    )


def evaluate_time_events(db: Session) -> list[dict[str, Any]]:
    """Backup path (manual tick): fire any currently due one-shots. Deduped per animal."""
    global_cfg = get_or_create_settings(db)
    if not global_cfg.email_enabled:
        return []
    results: list[dict[str, Any]] = []

    for animal in list_animals(db):
        overview = build_overview(db, animal.id)
        aid = animal.id
        cfg = get_merged_settings(db, aid)

        feed = overview.get("next_feed")
        if cfg.event_feed_overdue and feed and feed["days_until"] < 0:
            results.append(fire_feed_overdue(db, aid))

        handle = overview["clear_to_handle"]
        last_feed = overview.get("last_feed")
        if (
            cfg.event_handle_cleared
            and handle.get("ready")
            and handle.get("clear_at")
            and last_feed
            and last_feed.get("accepted")
        ):
            results.append(fire_handle_cleared(db, aid))

        gap = overview.get("handling_gap")
        if cfg.event_handling_gap and gap and gap.get("overdue") and handle.get("ready"):
            results.append(fire_handling_gap(db, aid))

        for item in overview.get("maintenance_items") or []:
            toggle = {
                "water": cfg.event_maint_water,
                "substrate": cfg.event_maint_substrate,
                "deep_clean": cfg.event_maint_deep_clean,
            }.get(item["kind"], True)
            if toggle and (item.get("overdue") or item.get("due_today")):
                results.append(fire_maint_due(db, item["kind"], aid))

        weight = overview.get("weight_due")
        if cfg.event_weight_due and weight and weight.get("due"):
            results.append(fire_weight_due(db, aid))

    return results


def notify_shed_status(
    db: Session, status: str, cycle_id: int, animal_id: int | None = None
) -> dict[str, Any]:
    if status not in ("blue", "opaque"):
        return {"ok": False, "skipped": "not_active_shed"}
    from app.services.species_packs import get_pack, resolve_species_key

    animal = get_animal(db, animal_id)
    name = animal.name if animal else "Pet"
    humidity = "60–70%"
    aid = animal.id if animal else animal_id
    if animal is not None:
        env = get_pack(resolve_species_key(animal.species, animal.name)).get("env") or {}
        rh = env.get("rh_shed") or env.get("rh_normal")
        if rh and len(rh) >= 2:
            humidity = f"{int(rh[0])}–{int(rh[1])}%"
    return send_event_email(
        db,
        "shed_status",
        f"{name}: shed — {status}",
        f"Shed status is now {status}. Raise humidity to {humidity}."
        + (" Do not feed while opaque." if status == "opaque" else ""),
        f"shed_status:{cycle_id}:{status}",
        animal_id=aid,
    )


def notify_regurg(db: Session, regurg_id: int, notes: str, animal_id: int | None = None) -> dict[str, Any]:
    animal = get_animal(db, animal_id)
    name = animal.name if animal else "Pet"
    aid = animal.id if animal else animal_id
    return send_event_email(
        db,
        "regurg",
        f"{name}: regurgitation logged",
        f"A regurgitation was logged. Notes: {notes or '—'}. Check temps and consider vet if repeated.",
        f"regurg:{regurg_id}",
        animal_id=aid,
    )


def notify_tail_drop(
    db: Session, tail_id: int, cause: str, notes: str, animal_id: int | None = None
) -> dict[str, Any]:
    animal = get_animal(db, animal_id)
    name = animal.name if animal else "Pet"
    aid = animal.id if animal else animal_id
    detail = cause or notes or "—"
    return send_event_email(
        db,
        "tail_drop",
        f"{name}: tail drop logged",
        f"A tail drop was logged ({detail}). Tails do not regenerate — note enclosure hazards.",
        f"tail_drop:{tail_id}",
        animal_id=aid,
    )


def run_tick(db: Session) -> dict[str, Any]:
    """Optional backup poke — digests use a 5-minute after-window; events fire if due."""
    cfg = get_or_create_settings(db)
    now = local_now(cfg)
    hhmm = now.strftime("%H:%M")
    digest: dict[str, Any] = {"ok": False, "skipped": "not_digest_time", "now": hhmm}

    def _past_within(target: str, window_min: int = 5) -> bool:
        try:
            th, tm = [int(x) for x in target[:5].split(":")]
            delta = (now.hour * 60 + now.minute) - (th * 60 + tm)
            return 0 <= delta <= window_min
        except Exception:
            return False

    if _past_within(cfg.digest_time_1):
        digest = send_digest(db, slot="am")
    elif cfg.digest_second_enabled and _past_within(cfg.digest_time_2):
        digest = send_digest(db, slot="pm")

    events = evaluate_time_events(db)
    return {"digest": digest, "events": events, "scheduler": "in-process"}
