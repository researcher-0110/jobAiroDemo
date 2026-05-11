import csv
import hashlib
from pathlib import Path
from datetime import datetime
import scrapy
from jobairo_scraper.items import JobItem

SEEDS_PATH = Path(__file__).parent.parent.parent / "seeds" / "ats_boards.csv"

class ATSDiscoverySpider(scrapy.Spider):
    name = "ats_discovery"
    custom_settings = {
        "ROBOTSTXT_OBEY": False,  # discovery needs to check all URLs
    }

    def start_requests(self):
        if not SEEDS_PATH.exists():
            self.logger.error(f"Seeds file not found: {SEEDS_PATH}")
            return

        with open(SEEDS_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                url = row.get("board_url", "").strip()
                ats = row.get("ats_type", "").strip().lower()
                if not url:
                    continue
                yield scrapy.Request(
                    url,
                    callback=self._detect_and_route,
                    meta={"ats_type": ats, "board_url": url},
                    errback=self._handle_error,
                )

    def _detect_and_route(self, response):
        board_url = response.meta["board_url"]
        ats_type = response.meta.get("ats_type", "")

        if not ats_type:
            # Auto-detect from URL/content
            if "greenhouse.io" in board_url:
                ats_type = "greenhouse"
            elif "lever.co" in board_url:
                ats_type = "lever"
            elif "myworkdayjobs.com" in board_url:
                ats_type = "workday"

        self.logger.info(f"Discovered board: {board_url} [{ats_type}]")
        # Save discovered board to Supabase ats_boards table
        # (scraping is delegated to dedicated spiders)

    def _handle_error(self, failure):
        self.logger.warning(f"Board unreachable: {failure.request.url} — {failure.value}")
