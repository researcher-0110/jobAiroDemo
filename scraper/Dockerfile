FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /var/log/jobairo /tmp/scrapy_jobs

# Default: run greenhouse spider; override with docker compose run scraper scrapy crawl lever
CMD ["scrapy", "crawl", "greenhouse", "--set", "SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production"]
