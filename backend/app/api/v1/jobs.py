from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.job import JobSearchParams, JobsResponse, JobOut, JobActionIn
from app.services import jobs as jobs_service
from app.api.deps import get_current_user, get_optional_user
from typing import Optional, Literal

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=JobsResponse)
async def search_jobs(
    keyword: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    posted_after: Optional[str] = Query(None),
    sort_by: Literal["relevance", "date", "salary"] = Query("date"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    params = JobSearchParams(
        keyword=keyword, location=location, type=type,
        salary_min=salary_min, posted_after=posted_after,
        sort_by=sort_by, page=page, per_page=per_page,
    )
    return jobs_service.search_jobs(params)

@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = jobs_service.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{job_id}/actions", status_code=204)
async def job_action(
    job_id: str,
    body: JobActionIn,
    current_user: dict = Depends(get_current_user),
):
    jobs_service.record_job_action(current_user["sub"], job_id, body.action)
