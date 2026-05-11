from fastapi import APIRouter, Depends, Query
from app.api.deps import get_admin_user
from app.core.supabase import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_stats(_admin: dict = Depends(get_admin_user)):
    sb = get_supabase()
    jobs_count = sb.table("jobs").select("id", count="exact").execute()
    users_count = sb.table("analytics_events").select("user_id", count="exact").execute()
    return {
        "total_jobs": jobs_count.count,
        "total_events": users_count.count,
    }
