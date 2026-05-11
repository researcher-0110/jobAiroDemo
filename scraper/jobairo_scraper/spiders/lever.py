import hashlib
from datetime import datetime
import scrapy
from jobairo_scraper.items import JobItem

class LeverSpider(scrapy.Spider):
    name = "lever"
    # Usage: scrapy crawl lever -a boards="netflix,figma,notion"

    def __init__(self, boards: str = "", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.boards = [b.strip() for b in boards.split(",") if b.strip()] if boards else []

    def start_requests(self):
        for board in self.boards:
            api_url = f"https://api.lever.co/v0/postings/{board}?mode=json"
            yield scrapy.Request(
                api_url,
                callback=self.parse_board,
                meta={"board": board},
                errback=self._handle_error,
            )

    def parse_board(self, response):
        board = response.meta["board"]
        board_url = f"https://jobs.lever.co/{board}"
        try:
            jobs = response.json()
        except Exception:
            self.logger.error(f"Failed to parse JSON from {response.url}")
            return

        for job in (jobs if isinstance(jobs, list) else []):
            job_id = hashlib.md5(
                f"{board}{job.get('text','')}{job.get('applyUrl','')}".encode()
            ).hexdigest()

            location = ""
            categories = job.get("categories", {})
            if isinstance(categories, dict):
                location = categories.get("location", "")

            commitment = ""
            if isinstance(categories, dict):
                commitment = categories.get("commitment", "full-time").lower()

            item = JobItem(
                id=job_id,
                title=job.get("text", ""),
                company=board,
                location=location,
                type=commitment if commitment in ("full-time","part-time","contract") else "full-time",
                description=job.get("descriptionPlain", ""),
                apply_url=job.get("applyUrl", job.get("hostedUrl", "")),
                ats_source="lever",
                board_url=board_url,
                posted_at=datetime.utcfromtimestamp(
                    job["createdAt"] / 1000
                ).isoformat() if job.get("createdAt") else None,
                created_at=datetime.utcnow().isoformat(),
            )
            yield item

    def _handle_error(self, failure):
        self.logger.warning(f"Lever board error: {failure.request.url} — {failure.value}")
