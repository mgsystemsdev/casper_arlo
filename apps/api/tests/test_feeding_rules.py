"""Tests for age → prey category feeding recommendations (ball python + crestie packs)."""

from app.services.feeding_rules import (
    PREY,
    STAGE_FEEDING_RULES,
    assert_config_integrity,
    recommend_feeding,
    stage_from_months,
)


def test_config_integrity():
    assert_config_integrity()
    assert_config_integrity("ball_python")
    assert_config_integrity("crested_gecko")


def test_stage_boundaries():
    assert stage_from_months(0)["label"] == "Hatchling"
    assert stage_from_months(2)["label"] == "Hatchling"
    assert stage_from_months(3)["label"] == "Juvenile"
    assert stage_from_months(11)["label"] == "Juvenile"
    assert stage_from_months(12)["label"] == "Sub-adult"
    assert stage_from_months(35)["label"] == "Sub-adult"
    assert stage_from_months(36)["label"] == "Adult"


def test_crestie_stage_boundaries():
    assert stage_from_months(11, "crested_gecko")["label"] == "Juvenile"
    assert stage_from_months(12, "crested_gecko")["label"] == "Sub-adult"
    assert stage_from_months(23, "crested_gecko")["label"] == "Sub-adult"
    assert stage_from_months(24, "crested_gecko")["label"] == "Adult"


def test_stage_interval_midpoints():
    assert stage_from_months(1)["feed_interval_days"] == 6
    assert stage_from_months(9)["feed_interval_days"] == 8
    assert stage_from_months(20)["feed_interval_days"] == 12
    assert stage_from_months(40)["feed_interval_days"] == 17


def test_recommended_items_per_stage():
    for months, label in [(1, "Hatchling"), (6, "Juvenile"), (18, "Sub-adult"), (40, "Adult")]:
        rules = STAGE_FEEDING_RULES[label]
        rec = recommend_feeding(months, rules["recommended"][0])
        assert rec["stage"] == label
        assert rec["prey_status"] == "recommended"
        for item in rules["recommended"]:
            assert recommend_feeding(months, item)["prey_status"] == "recommended"


def test_acceptable_and_alternative():
    juv = recommend_feeding(6, "Norwegian small")
    assert juv["prey_status"] == "acceptable"
    # No birds — Rabbit is the only Adult alternative
    adult_alt = recommend_feeding(40, "Rabbit")
    assert adult_alt["prey_status"] == "alternative"
    # Crestie insects
    cg = recommend_feeding(6, "Crickets", pack_key="crested_gecko")
    assert cg["prey_status"] == "acceptable"
    cg_alt = recommend_feeding(6, "Roaches", pack_key="crested_gecko")
    assert cg_alt["prey_status"] == "alternative"


def test_too_small_and_too_large():
    # Juvenile BP: Norwegian jumbo / Rabbit above band; Pinky too small for Adult
    assert recommend_feeding(6, "Norwegian jumbo")["prey_status"] == "too_large"
    assert recommend_feeding(1, "Norwegian medium")["prey_status"] == "too_large"
    assert recommend_feeding(40, "Pinky mouse")["prey_status"] == "too_small"
    assert recommend_feeding(1, "Norwegian small")["prey_status"] == "too_large"


def test_unknown_prey():
    out = recommend_feeding(6, "Guinea pig")
    assert out["prey_status"] == "unknown"
    assert out["selected_prey"] == "Guinea pig"


def test_null_selected_prey():
    out = recommend_feeding(6, None)
    assert out["selected_prey"] is None
    assert out["prey_status"] is None
    assert out["recommended_prey"] == STAGE_FEEDING_RULES["Juvenile"]["recommended"]
    assert out["feeding_interval"]["recommended_days"] == 8


def test_stage_transition_same_prey():
    """Adult mouse: recommended at 11 mo, acceptable at 12 mo (sub-adult)."""
    assert recommend_feeding(11, "Adult mouse")["stage"] == "Juvenile"
    assert recommend_feeding(11, "Adult mouse")["prey_status"] == "recommended"
    assert recommend_feeding(12, "Adult mouse")["stage"] == "Sub-adult"
    assert recommend_feeding(12, "Adult mouse")["prey_status"] == "acceptable"


def test_interval_shape():
    out = recommend_feeding(6, "Adult mouse")
    iv = out["feeding_interval"]
    assert iv == {"min_days": 7, "max_days": 10, "recommended_days": 8}


def test_prey_status_by_category_covers_prey():
    out = recommend_feeding(6, None)
    assert set(out["prey_status_by_category"].keys()) == set(PREY)
    assert out["prey_status_by_category"]["Adult mouse"] == "recommended"
    assert out["prey_status_by_category"]["Fuzzy mouse"] == "acceptable"
    assert out["prey_status_by_category"]["Norwegian jumbo"] == "too_large"
    assert "Day-old chick" not in out["prey_status_by_category"]
    assert "Quail" not in out["prey_status_by_category"]


def test_return_lists_present():
    out = recommend_feeding(18, "Norwegian weaned")
    assert "acceptable_prey" in out
    assert "alternative_prey" in out
    assert "Norwegian weaned" in out["recommended_prey"]


def test_crestie_cgd_recommended():
    out = recommend_feeding(6, "CGD (Repashy/Pangea)", pack_key="crested_gecko")
    assert out["prey_status"] == "recommended"
    assert out["feeding_interval"]["recommended_days"] == 2
