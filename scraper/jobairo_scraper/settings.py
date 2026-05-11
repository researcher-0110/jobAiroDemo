import os
from dotenv import load_dotenv
load_dotenv()

BOT_NAME = "jobairo_scraper"
SPIDER_MODULES = ["jobairo_scraper.spiders"]
NEWSPIDER_MODULE = "jobairo_scraper.spiders"

ROBOTSTXT_OBEY = True
CONCURRENT_REQUESTS = 4
DOWNLOAD_DELAY = 1.5
RANDOMIZE_DOWNLOAD_DELAY = True
COOKIES_ENABLED = False
TELNETCONSOLE_ENABLED = False

DEFAULT_REQUEST_HEADERS = {
    "Accept": "application/json, text/html,*/*",
    "Accept-Language": "en",
    "User-Agent": "Mozilla/5.0 (compatible; JobAiroBot/1.0; +https://jobairo.com/bot)",
}

DOWNLOADER_MIDDLEWARES = {
    "jobairo_scraper.middlewares.proxy.RotatingProxyMiddleware": 610,
    "jobairo_scraper.middlewares.retry.SmartRetryMiddleware": 550,
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": None,  # disable default
}

ITEM_PIPELINES = {
    "jobairo_scraper.pipelines.dedup.DedupPipeline": 100,
    "jobairo_scraper.pipelines.supabase_pipeline.SupabasePipeline": 200,
}

# Supabase
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Proxy (optional in dev)
PROXY_URL = os.environ.get("PROXY_URL", "")
PROXY_USER = os.environ.get("PROXY_USER", "")
PROXY_PASS = os.environ.get("PROXY_PASS", "")

# SMTP alerts
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "")

LOG_LEVEL = "INFO"
