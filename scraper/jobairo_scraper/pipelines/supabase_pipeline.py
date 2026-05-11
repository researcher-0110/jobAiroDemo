from datetime import datetime
from supabase import create_client
import logging

logger = logging.getLogger(__name__)

class SupabasePipeline:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.sb = create_client(supabase_url, supabase_key)
        self._batch: list[dict] = []
        self._batch_size = 50

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            supabase_url=crawler.settings["SUPABASE_URL"],
            supabase_key=crawler.settings["SUPABASE_SERVICE_KEY"],
        )

    def process_item(self, item, spider):
        record = {
            "id": item["id"],
            "title": item.get("title", ""),
            "company": item.get("company", ""),
            "location": item.get("location", ""),
            "type": item.get("type"),
            "salary_min": item.get("salary_min"),
            "salary_max": item.get("salary_max"),
            "description": item.get("description", ""),
            "apply_url": item.get("apply_url", ""),
            "ats_source": item.get("ats_source", ""),
            "board_url": item.get("board_url", ""),
            "posted_at": item.get("posted_at"),
            "created_at": item.get("created_at", datetime.utcnow().isoformat()),
        }
        self._batch.append(record)
        if len(self._batch) >= self._batch_size:
            self._flush()
        return item

    def close_spider(self, spider):
        if self._batch:
            self._flush()

    def _flush(self):
        try:
            self.sb.table("jobs").upsert(self._batch, on_conflict="id").execute()
            logger.info(f"SupabasePipeline: upserted {len(self._batch)} jobs")
        except Exception as e:
            logger.error(f"SupabasePipeline: flush failed — {e}")
        finally:
            self._batch = []
