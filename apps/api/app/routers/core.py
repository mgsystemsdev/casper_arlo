from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import create_token, require_auth, token_expires_at
from app.config import get_settings
from app.db import get_db
from app.deps import AnimalId
from app.schemas import AnimalHeroUpdate, LoginRequest, TokenResponse
from app.services.care import (
    animal_summary,
    build_overview,
    calc_age,
    get_animal,
    list_animals,
    set_animal_hero,
)
from app.services.feeding_rules import feeding_config, recommend_feeding
from app.services.species_packs import resolve_species_key

router = APIRouter(prefix="/api", tags=["core"])


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    if body.password != get_settings().app_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    return TokenResponse(token=create_token(), expires_at=token_expires_at())


@router.get("/animals")
def animals_list(_: None = Depends(require_auth), db: Session = Depends(get_db)):
    return [animal_summary(a, db) for a in list_animals(db)]


@router.get("/animal")
def animal_overview(
    aid: AnimalId,
    _: None = Depends(require_auth),
    db: Session = Depends(get_db),
):
    try:
        return build_overview(db, aid)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/animal")
def patch_animal(
    body: AnimalHeroUpdate,
    aid: AnimalId,
    _: None = Depends(require_auth),
    db: Session = Depends(get_db),
):
    animal = get_animal(db, aid)
    if animal is None:
        raise HTTPException(status_code=404, detail="No animal")
    try:
        set_animal_hero(db, animal, body.hero_photo_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build_overview(db, aid)


@router.get("/feeding/config")
def get_feeding_config(
    aid: AnimalId,
    _: None = Depends(require_auth),
    db: Session = Depends(get_db),
) -> dict:
    animal = get_animal(db, aid)
    if animal is None:
        raise HTTPException(404, "No animal")
    pack_key = resolve_species_key(animal.species, animal.name)
    return feeding_config(pack_key)


@router.get("/feeding/recommend")
def get_feeding_recommend(
    aid: AnimalId,
    prey: str | None = Query(default=None),
    _: None = Depends(require_auth),
    db: Session = Depends(get_db),
) -> dict:
    animal = get_animal(db, aid)
    if animal is None:
        raise HTTPException(status_code=404, detail="No animal")
    age = calc_age(animal.dob)
    pack_key = resolve_species_key(animal.species, animal.name)
    return recommend_feeding(age["months"], prey, pack_key=pack_key)


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}
