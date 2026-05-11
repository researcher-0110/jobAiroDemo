from fastapi import APIRouter, Depends, Query
from app.schemas.job import JobOut
from app.services import recommendations as rec_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("", response_model=list[JobOut])
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    return rec_service.get_recommendations(current_user["sub"], limit)
