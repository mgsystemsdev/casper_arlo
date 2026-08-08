from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.care import get_animal


def get_animal_id(
    animal_id: Annotated[int | None, Query()] = None,
    db: Session = Depends(get_db),
) -> int:
    animal = get_animal(db, animal_id)
    if animal is None:
        raise HTTPException(404, "No animal")
    return animal.id


AnimalId = Annotated[int, Depends(get_animal_id)]
