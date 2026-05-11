import hashlib
from datetime import datetime
import scrapy
from jobairo_scraper.items import JobItem

class WorkdaySpider(scrapy.Spider):
    name = "workday"
    # Usage: scrapy crawl workday -a boards="apple,amazon"
    # boards format: "company_slug:workday_tenant_id"

    def __init__(self, boards: str = "", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.boards = [b.strip() for b in boards.split(",") if b.strip()] if boards else []

    def start_requests(self):
        for board in self.boards:
            parts = board.split(":")
            company = parts[0]
            tenant = parts[1] if len(parts) > 1 else parts[0]
            api_url = (
                f"https://{company}.wd1.myworkdayjobs.com/wday/cxs/{company}/{tenant}/jobs"
            )
            yield scrapy.Request(
                api_url,
                method="POST",
                body='{"limit":20,"offset":0,"searchText":"","appliedFacets":{}}',
                headers={"Content-Type": "application/json"},
                callback=self.parse_board,
                meta={"company": company, "tenant": tenant, "offset": 0},
                errback=self._handle_error,
            )

    def parse_board(self, response):
        company = response.meta["company"]
        offset = response.meta["offset"]
        try:
            data = response.json()
        except Exception:
            return

        postings = data.get("jobPostings", [])
        for job in postings:
            ext_id = job.get("externalPath", "").strip("/").replace("/", "_")
            job_id = hashlib.md5(f"{company}{ext_id}".encode()).hexdigest()
            item = JobItem(
                id=job_id,
                title=job.get("title", ""),
                company=company,
                location=job.get("locationsText", ""),
                type="full-time",
                description="",
                apply_url=f"https://{company}.wd1.myworkdayjobs.com{job.get('externalPath','')}",
                ats_source="workday",
                board_url=f"https://{company}.wd1.myworkdayjobs.com",
                posted_at=job.get("postedOn"),
                created_at=datetime.utcnow().isoformat(),
            )
            yield item

        # Paginate
        total = data.get("total", 0)
        if offset + len(postings) < total and postings:
            next_offset = offset + len(postings)
            tenant = response.meta["tenant"]
            yield scrapy.Request(
                response.url,
                method="POST",
                body=f'{{"limit":20,"offset":{next_offset},"searchText":"","appliedFacets":{{}}}}',
                headers={"Content-Type": "application/json"},
                callback=self.parse_board,
                meta={"company": company, "tenant": tenant, "offset": next_offset},
            )

    def _handle_error(self, failure):
        self.logger.warning(f"Workday error: {failure.request.url} — {failure.value}")
