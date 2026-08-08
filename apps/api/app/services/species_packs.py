"""Species care packs — feeding, habitat bands, UI labels.

Mapped from Animal.species scientific name.
"""

from __future__ import annotations

from typing import Any, Literal

SpeciesKey = Literal["ball_python", "crested_gecko"]

# --- Ball python (Casper) — Allie prey ladder minus birds ---
BP_FOOD: list[str] = [
    "Pinky mouse",
    "Fuzzy mouse",
    "Adult mouse",
    "Norwegian pinky",
    "Norwegian fuzzy",
    "Norwegian pup",
    "Norwegian weaned",
    "Norwegian small",
    "Norwegian medium",
    "Norwegian large",
    "Norwegian jumbo",
    "Rabbit",
]

BP_SIZE_ORDER: dict[str, int] = {
    "Pinky mouse": 10,
    "Norwegian pinky": 15,
    "Fuzzy mouse": 20,
    "Norwegian fuzzy": 25,
    "Adult mouse": 30,
    "Norwegian pup": 35,
    "Norwegian weaned": 45,
    "Norwegian small": 55,
    "Norwegian medium": 65,
    "Norwegian large": 75,
    "Norwegian jumbo": 85,
    "Rabbit": 95,
}

BP_STAGES: dict[str, dict[str, Any]] = {
    "Hatchling": {
        "desc": "0–3 months",
        "recommended": ["Pinky mouse", "Fuzzy mouse", "Norwegian pinky"],
        "acceptable": ["Adult mouse", "Norwegian fuzzy"],
        "alternative": [],
        "feeding_interval": {"min_days": 5, "max_days": 7, "recommended_days": 6},
    },
    "Juvenile": {
        "desc": "3–12 months",
        "recommended": [
            "Adult mouse",
            "Norwegian fuzzy",
            "Norwegian pup",
            "Norwegian weaned",
        ],
        "acceptable": ["Fuzzy mouse", "Norwegian pinky", "Norwegian small"],
        "alternative": [],
        "feeding_interval": {"min_days": 7, "max_days": 10, "recommended_days": 8},
    },
    "Sub-adult": {
        "desc": "1–3 years",
        "recommended": ["Norwegian weaned", "Norwegian small", "Norwegian medium"],
        "acceptable": ["Adult mouse", "Norwegian pup", "Norwegian large"],
        "alternative": [],
        "feeding_interval": {"min_days": 10, "max_days": 14, "recommended_days": 12},
    },
    "Adult": {
        "desc": "3+ years",
        "recommended": ["Norwegian small", "Norwegian medium", "Norwegian large"],
        "acceptable": ["Norwegian weaned", "Norwegian jumbo"],
        "alternative": ["Rabbit"],
        "feeding_interval": {"min_days": 14, "max_days": 21, "recommended_days": 17},
    },
}

# --- Crested gecko (Arlo) ---
CG_FOOD: list[str] = [
    "CGD (Repashy/Pangea)",
    "Crickets",
    "Dubia nymphs",
    "Roaches",
    "Fruit treat",
    "Other insect",
]

CG_SIZE_ORDER: dict[str, int] = {
    "CGD (Repashy/Pangea)": 50,
    "Crickets": 40,
    "Dubia nymphs": 45,
    "Roaches": 55,
    "Fruit treat": 20,
    "Other insect": 40,
}

CG_STAGES: dict[str, dict[str, Any]] = {
    "Hatchling": {
        "desc": "0–3 months",
        "recommended": ["CGD (Repashy/Pangea)"],
        "acceptable": ["Fruit treat"],
        "alternative": ["Crickets"],
        "feeding_interval": {"min_days": 1, "max_days": 2, "recommended_days": 2},
    },
    "Juvenile": {
        "desc": "3–12 months",
        "recommended": ["CGD (Repashy/Pangea)"],
        "acceptable": ["Crickets", "Dubia nymphs", "Fruit treat"],
        "alternative": ["Roaches", "Other insect"],
        "feeding_interval": {"min_days": 2, "max_days": 3, "recommended_days": 2},
    },
    "Sub-adult": {
        "desc": "1–2 years",
        "recommended": ["CGD (Repashy/Pangea)"],
        "acceptable": ["Crickets", "Dubia nymphs", "Roaches"],
        "alternative": ["Fruit treat", "Other insect"],
        "feeding_interval": {"min_days": 2, "max_days": 3, "recommended_days": 2},
    },
    "Adult": {
        "desc": "2+ years",
        "recommended": ["CGD (Repashy/Pangea)"],
        "acceptable": ["Crickets", "Dubia nymphs", "Roaches"],
        "alternative": ["Fruit treat"],
        "feeding_interval": {"min_days": 2, "max_days": 4, "recommended_days": 3},
    },
}

PACKS: dict[str, dict[str, Any]] = {
    "ball_python": {
        "key": "ball_python",
        "theme": "casper",
        "food_noun": "prey",
        "guide_label": "Prey Guide",
        "supports_regurg": True,
        "supports_tail": False,
        "has_basking": True,
        "food_categories": BP_FOOD,
        "food_size_order": BP_SIZE_ORDER,
        "stages": BP_STAGES,
        "env": {
            "hot": (88.0, 92.0),
            "cool": (76.0, 80.0),
            "night": (72.0, 75.0),
            "rh_normal": (60.0, 80.0),
            "rh_shed": (80.0, 90.0),
            "hot_label": "Basking (hot hide)",
            "cool_label": "Cool end",
            "night_label": "Night min",
        },
        "habitat_zones": [
            {"label": "Basking", "f": "88–92°F", "c": "31–33°C"},
            {"label": "Ambient warm", "f": "80–85°F", "c": "27–29°C"},
            {"label": "Cool end", "f": "76–80°F", "c": "24–27°C"},
            {"label": "Night min", "f": "72–75°F", "c": "22–24°C"},
        ],
        "facts": [
            ["Origin", "West / Central Africa"],
            ["Habitat", "Grassland, forest edges — terrestrial"],
            ["Adult length", "1–1.5 m (3–5 ft)"],
            ["Adult weight", "1–2 kg typical"],
            ["Lifespan (captive)", "20–30 years"],
            ["Sexual maturity", "2–3 years typical"],
            ["Activity pattern", "Nocturnal"],
            ["Temperament", "Docile; common hunger strikers"],
            ["Feeding method", "Constriction — frozen/thawed rodents"],
            ["Conservation status", "Least Concern (IUCN)"],
            ["Note", "BEL morphs can be light-sensitive"],
        ],
        "handling_tips": [
            ["After feeding", "48–72 hrs minimum"],
            ["Session length", "10–20 min for juveniles"],
            ["Approach", "Support body — never dangle"],
            ["BEL note", "Blue-eyed leucistics can be light-sensitive"],
        ],
        "habitat_notes": [
            ["Photoperiod", "12 hrs light / 12 hrs dark"],
            ["Substrate", "Coco coir, cypress mulch, or aspen (dry end)"],
            ["Hides", "Hot + cool hide minimum; humid hide for shed"],
        ],
        "guide_notes": [
            "All prey frozen/thawed — never live.",
            "Match prey width to the widest point of the body.",
            "Don't lengthen the next gap just because a feed was late.",
            "Hunger strikes are common; check temps/humidity first.",
        ],
        "health_indicators": [
            ["good", "Clear, alert eyes", "Good sign"],
            ["good", "Clean vent, no swelling", "Check monthly"],
            ["good", "Solid muscle tone", "Body condition"],
            ["warn", "Wheezing / mucus", "Respiratory — vet"],
            ["warn", "Retained shed / eye caps", "Raise humidity"],
            ["warn", "Prolonged hunger strike", "Monitor weight"],
            ["bad", "Stargazing / wobbling", "IBD — vet urgently"],
            ["bad", "Mites — tiny black dots", "Treat enclosure + snake"],
        ],
    },
    "crested_gecko": {
        "key": "crested_gecko",
        "theme": "arlo",
        "food_noun": "food",
        "guide_label": "Diet Guide",
        "supports_regurg": False,
        "supports_tail": True,
        "has_basking": False,
        "food_categories": CG_FOOD,
        "food_size_order": CG_SIZE_ORDER,
        "stages": CG_STAGES,
        "env": {
            "hot": (74.0, 78.0),  # warm ambient (no basking bulb)
            "cool": (72.0, 76.0),
            "night": (65.0, 72.0),
            "rh_normal": (60.0, 80.0),
            "rh_shed": (70.0, 90.0),
            "hot_label": "Warm ambient",
            "cool_label": "Cool ambient",
            "night_label": "Night",
        },
        "habitat_zones": [
            {"label": "Ambient", "f": "72–78°F", "c": "22–26°C"},
            {"label": "Ideal", "f": "74–76°F", "c": "23–24°C"},
            {"label": "Max", "f": "~80°F", "c": "avoid hotter"},
            {"label": "Night", "f": "65–72°F", "c": "18–22°C"},
        ],
        "facts": [
            ["Origin", "New Caledonia"],
            ["Habitat", "Arboreal — rainforest canopy"],
            ["Adult length", "15–25 cm (incl. tail)"],
            ["Lifespan (captive)", "15–20 years"],
            ["Sexual maturity", "~15–18 months"],
            ["Activity pattern", "Nocturnal / crepuscular"],
            ["Temperament", "Curious; may jump — handle low"],
            ["Diet", "CGD staple + occasional insects"],
            ["Tail", "Prehensile; does not regrow if dropped"],
            ["Conservation status", "Vulnerable (wild) — captive bred preferred"],
            ["Note", "No basking lamp — overheating is dangerous"],
        ],
        "handling_tips": [
            ["After feeding", "Short wait fine — CGD is not a large prey item"],
            ["Session length", "5–15 min; watch for stress"],
            ["Approach", "Never grab the tail"],
            ["Tail autotomy", "Dropped tails do not regenerate"],
        ],
        "habitat_notes": [
            ["Photoperiod", "12 hrs light / 12 hrs dark (no UVB required for CGD keepers)"],
            ["Substrate", "Coco fiber / bioactive mix — holds humidity"],
            ["Vertical space", "Tall enclosure with branches + hides"],
        ],
        "guide_notes": [
            "CGD (Repashy or Pangea) is the staple — not live prey.",
            "Refresh CGD every 24–36 hrs; remove uneaten mix.",
            "Dust insects with calcium when offered.",
            "Lily White morphs have no special diet needs.",
        ],
        "health_indicators": [
            ["good", "CGD consumed regularly", "Appetite — good sign"],
            ["good", "Alert, climbing at night", "Normal activity"],
            ["good", "Intact, fleshy tail", "No drop logged"],
            ["warn", "Stuck shed on toes", "Raise humidity / mist"],
            ["warn", "Lethargy / not climbing", "Check temps"],
            ["warn", "Soft jaw / kinked spine", "MBD risk — vet"],
            ["bad", "Open-mouth breathing", "RI — vet"],
            ["bad", "Sudden weight loss", "Vet soon"],
        ],
    },
}


def resolve_species_key(species: str | None, name: str | None = None) -> SpeciesKey:
    blob = f"{species or ''} {name or ''}".lower()
    if "ciliatus" in blob or "crested" in blob or "arlo" in blob:
        return "crested_gecko"
    if "regius" in blob or "ball" in blob or "casper" in blob:
        return "ball_python"
    return "ball_python"


def get_pack(species_or_key: str, name: str | None = None) -> dict[str, Any]:
    if species_or_key in PACKS:
        return PACKS[species_or_key]
    return PACKS[resolve_species_key(species_or_key, name)]


def pack_public(pack: dict[str, Any]) -> dict[str, Any]:
    """Subset safe to expose on overview / config APIs."""
    return {
        "key": pack["key"],
        "theme": pack["theme"],
        "food_noun": pack["food_noun"],
        "guide_label": pack["guide_label"],
        "supports_regurg": pack["supports_regurg"],
        "supports_tail": pack["supports_tail"],
        "has_basking": pack["has_basking"],
        "env": pack["env"],
        "habitat_zones": pack["habitat_zones"],
        "facts": pack["facts"],
        "handling_tips": pack["handling_tips"],
        "guide_notes": pack["guide_notes"],
        "habitat_notes": pack.get("habitat_notes") or [],
        "health_indicators": pack["health_indicators"],
    }
