from pydantic import BaseModel
from typing import Optional, Literal, Any

AnalyticsEventType = Literal[
    "search_impression",
    "job_click",
    "apply_click",
    "view_duration",
    "search_query",
    "alert_creation",
]

class AnalyticsEventIn(BaseModel):
    event_type: AnalyticsEventType
    job_id: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
