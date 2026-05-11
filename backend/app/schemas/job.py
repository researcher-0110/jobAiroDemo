from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class JobOut(BaseModel):
    id: str
    title: str
    company: str
    location: str
    type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: str
    apply_url: str
    ats_source: str
    board_url: str
    posted_at: Optional[datetime] = None
    created_at: datetime

class JobSearchParams(BaseModel):
    keyword: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    salary_min: Optional[int] = None
    posted_after: Optional[str] = None
    sort_by: Literal["relevance", "date", "salary"] = "date"
    page: int = 1
    per_page: int = 20

class JobsResponse(BaseModel):
    jobs: list[JobOut]
    total: int
    page: int
    per_page: int

class JobActionIn(BaseModel):
    action: Literal["save", "hide", "apply", "report"]
