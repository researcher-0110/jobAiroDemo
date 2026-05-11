import hashlib
import json
from datetime import datetime
import scrapy
from jobairo_scraper.items import JobItem

class GreenhouseSpider(scrapy.Spider):
    name = "greenhouse"
    # boards loaded from Supabase ats_boards table or passed as argument
    # Usage: scrapy crawl greenhouse -a boards="shopify,stripe,airbnb"

    def __init__(self, boards: str = "", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.boards = [b.strip() for b in boards.split(",") if b.strip()] if boards else []

    def start_requests(self):
        for board in self.boards:
            api_url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
            yield scrapy.Request(
                api_url,
                callback=self.parse_board,
                meta={"board": board},
                errback=self._handle_error,
            )

    def parse_board(self, response):
        board = response.meta["board"]
        board_url = f"https://boards.greenhouse.io/{board}"
        try:
            data = response.json()
        except Exception:
            self.logger.error(f"Failed to parse JSON from {response.url}")
            return

        for job in data.get("jobs", []):
            job_id = hashlib.md5(
                f"{job.get('company_name','')}{job.get('title','')}{job.get('absolute_url','')}".encode()
            ).hexdigest()

            location = ""
            if job.get("location") and isinstance(job["location"], dict):
                location = job["location"].get("name", "")

            item = JobItem(
                id=job_id,
                title=job.get("title", ""),
                company=job.get("company_name", board),
                location=location,
                type="full-time",
                description=job.get("content", ""),
                apply_url=job.get("absolute_url", ""),
                ats_source="greenhouse",
                board_url=board_url,
                posted_at=job.get("updated_at"),
                created_at=datetime.utcnow().isoformat(),
            )
            yield item

    def _handle_error(self, failure):
        self.logger.warning(f"Greenhouse board error: {failure.request.url} — {failure.value}")
