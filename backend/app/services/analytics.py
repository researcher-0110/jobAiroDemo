from app.core.supabase import get_supabase
from app.schemas.analytics import AnalyticsEventIn
from datetime import datetime

def record_event(user_id: str | None, event: AnalyticsEventIn) -> None:
    sb = get_supabase()
    sb.table("analytics_events").insert({
        "user_id": user_id,
        "event_type": event.event_type,
        "job_id": event.job_id,
        "metadata": event.metadata,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
