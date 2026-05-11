from app.core.supabase import get_supabase
from app.schemas.job import JobOut

def get_recommendations(user_id: str, limit: int = 10) -> list[JobOut]:
    sb = get_supabase()
    # Get user's interaction history (saves weight 3x, applies 5x, views 1x)
    history = sb.table("user_job_actions").select("job_id, action").eq("user_id", user_id).execute()

    # Extract companies/titles from saved/applied jobs to rank similar ones
    engaged_job_ids = {r["job_id"] for r in (history.data or []) if r["action"] in ("save", "apply")}
    hidden_job_ids = {r["job_id"] for r in (history.data or []) if r["action"] == "hide"}

    query = sb.table("jobs").select("*").order("posted_at", desc=True).limit(limit * 3)
    result = query.execute()

    jobs = []
    for row in (result.data or []):
        if row["id"] in hidden_job_ids:
            continue
        jobs.append(JobOut(**row))
        if len(jobs) >= limit:
            break

    return jobs
