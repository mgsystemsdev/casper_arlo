"""Age → food-category feeding recommendations (species-pack aware)."""

from __future__ import annotations

from typing import Any, Literal

from app.services.species_packs import PACKS, get_pack

PreyStatus = Literal[
    "recommended",
    "acceptable",
    "too_small",
    "too_large",
    "alternative",
    "unknown",
]

# Back-compat aliases used by tests / intelligence (ball python pack).
PREY: list[str] = list(PACKS["ball_python"]["food_categories"])
PREY_SIZE_ORDER: dict[str, int] = dict(PACKS["ball_python"]["food_size_order"])
STAGE_FEEDING_RULES: dict[str, dict[str, Any]] = PACKS["ball_python"]["stages"]


def stage_from_months(months: int, pack_key: str = "ball_python") -> dict[str, Any]:
    """Age months → life stage. Boundaries: <3, <12, <36, else Adult."""
    pack = get_pack(pack_key)
    stages = pack["stages"]
    if months < 3:
        label = "Hatchling"
    elif months < 12:
        label = "Juvenile"
    elif months < 36:
        label = "Sub-adult"
    else:
        label = "Adult"
    # Crested gecko: Sub-adult is 1–2y; Adult starts at 24 months
    if pack_key == "crested_gecko":
        if months < 3:
            label = "Hatchling"
        elif months < 12:
            label = "Juvenile"
        elif months < 24:
            label = "Sub-adult"
        else:
            label = "Adult"
    rules = stages[label]
    return {
        "label": label,
        "desc": rules["desc"],
        "feed_interval_days": rules["feeding_interval"]["recommended_days"],
    }


def _classify_prey(selected: str, rules: dict[str, Any], pack: dict[str, Any]) -> PreyStatus:
    foods = pack["food_categories"]
    size_order = pack["food_size_order"]
    if selected not in foods:
        return "unknown"
    if selected in rules["recommended"]:
        return "recommended"
    if selected in rules["acceptable"]:
        return "acceptable"
    if selected in rules["alternative"]:
        return "alternative"

    rank = size_order.get(selected)
    if rank is None:
        return "unknown"

    band = rules["recommended"] + rules["acceptable"]
    ranks = [size_order[p] for p in band if p in size_order]
    if not ranks:
        return "unknown"
    min_ok, max_ok = min(ranks), max(ranks)
    if rank < min_ok:
        return "too_small"
    if rank > max_ok:
        return "too_large"
    return "unknown"


def recommend_feeding(
    age_months: int,
    selected_prey: str | None = None,
    pack_key: str = "ball_python",
) -> dict[str, Any]:
    pack = get_pack(pack_key)
    stage = stage_from_months(age_months, pack_key)
    label = stage["label"]
    rules = pack["stages"][label]
    foods = pack["food_categories"]

    status_by = {p: _classify_prey(p, rules, pack) for p in foods}

    if selected_prey is None or selected_prey == "":
        prey_status: PreyStatus | None = None
        selected_out: str | None = None
    else:
        selected_out = selected_prey
        prey_status = _classify_prey(selected_prey, rules, pack)

    return {
        "stage": label,
        "selected_prey": selected_out,
        "prey_status": prey_status,
        "recommended_prey": list(rules["recommended"]),
        "acceptable_prey": list(rules["acceptable"]),
        "alternative_prey": list(rules["alternative"]),
        "feeding_interval": dict(rules["feeding_interval"]),
        "prey_status_by_category": status_by,
    }


def feeding_config(pack_key: str = "ball_python") -> dict[str, Any]:
    pack = get_pack(pack_key)
    stages = {}
    for label, rules in pack["stages"].items():
        stages[label] = {
            "desc": rules["desc"],
            "recommended": list(rules["recommended"]),
            "acceptable": list(rules["acceptable"]),
            "alternative": list(rules["alternative"]),
            "feeding_interval": dict(rules["feeding_interval"]),
        }
    return {
        "prey_categories": list(pack["food_categories"]),
        "stages": stages,
        "species_key": pack["key"],
        "food_noun": pack["food_noun"],
        "guide_label": pack["guide_label"],
    }


def assert_config_integrity(pack_key: str | None = None) -> None:
    keys = [pack_key] if pack_key else list(PACKS.keys())
    for key in keys:
        pack = PACKS[key]
        foods = pack["food_categories"]
        size_order = pack["food_size_order"]
        assert set(size_order.keys()) == set(foods), f"{key}: size order must cover foods"
        for label, rules in pack["stages"].items():
            for list_key in ("recommended", "acceptable", "alternative"):
                for item in rules[list_key]:
                    assert item in foods, f"{key}.{label}.{list_key}: {item!r} not in foods"
            sets = [
                set(rules["recommended"]),
                set(rules["acceptable"]),
                set(rules["alternative"]),
            ]
            assert not (sets[0] & sets[1]), f"{key}.{label}: recommended ∩ acceptable"
            assert not (sets[0] & sets[2]), f"{key}.{label}: recommended ∩ alternative"
            assert not (sets[1] & sets[2]), f"{key}.{label}: acceptable ∩ alternative"
            iv = rules["feeding_interval"]
            assert iv["min_days"] <= iv["recommended_days"] <= iv["max_days"], f"{key}.{label}: interval"


assert_config_integrity()
