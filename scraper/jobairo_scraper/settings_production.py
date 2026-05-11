from jobairo_scraper.settings import *  # noqa: F401, F403

# Production overrides
ROBOTSTXT_OBEY = True
CONCURRENT_REQUESTS = 16
DOWNLOAD_DELAY = 1.0
RANDOMIZE_DOWNLOAD_DELAY = True
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 8.0
AUTOTHROTTLE_DEBUG = False

# Resume on failure
JOBDIR = "/tmp/scrapy_jobs"

# Retry
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

LOG_LEVEL = "WARNING"
LOG_FILE = "/var/log/jobairo/scraper.log"

# Feed export for audit
FEEDS = {
    "/var/log/jobairo/scraped_%(time)s.jsonl": {
        "format": "jsonlines",
        "overwrite": False,
    }
}
