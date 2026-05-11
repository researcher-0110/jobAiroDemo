from fastapi import APIRouter, Depends
from app.schemas.analytics import AnalyticsEventIn
from app.services import analytics as analytics_service
from app.api.deps import get_optional_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/events", status_code=204)
async def record_event(
    event: AnalyticsEventIn,
    current_user: dict | None = Depends(get_optional_user),
):
    user_id = current_user["sub"] if current_user else None
    analytics_service.record_event(user_id, event)
