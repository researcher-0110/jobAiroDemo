from app.core.supabase import get_supabase
from app.schemas.job import JobSearchParams, JobsResponse, JobOut
from datetime import datetime, timedelta

def search_jobs(params: JobSearchParams) -> JobsResponse:
    sb = get_supabase()
    query = sb.table("jobs").select("*", count="exact")

    if params.keyword:
        query = query.ilike("title", f"%{params.keyword}%")
    if params.location:
        query = query.ilike("location", f"%{params.location}%")
    if params.type:
        query = query.eq("type", params.type)
    if params.salary_min:
        query = query.gte("salary_min", params.salary_min)
    if params.posted_after:
        cutoffs = {"24h": 1, "week": 7, "month": 30}
        days = cutoffs.get(params.posted_after, 30)
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        query = query.gte("posted_at", cutoff)

    if params.sort_by == "date":
        query = query.order("posted_at", desc=True)
    elif params.sort_by == "salary":
        query = query.order("salary_max", desc=True)

    offset = (params.page - 1) * params.per_page
    query = query.range(offset, offset + params.per_page - 1)

    result = query.execute()
    jobs = [JobOut(**j) for j in (result.data or [])]
    return JobsResponse(
        jobs=jobs,
        total=result.count or 0,
        page=params.page,
        per_page=params.per_page,
    )

def get_job_by_id(job_id: str) -> JobOut | None:
    sb = get_supabase()
    result = sb.table("jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        return None
    return JobOut(**result.data)

def record_job_action(user_id: str, job_id: str, action: str) -> None:
    sb = get_supabase()
    sb.table("user_job_actions").upsert({
        "user_id": user_id,
        "job_id": job_id,
        "action": action,
    }).execute()
