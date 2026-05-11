from scrapy.exceptions import DropItem
from supabase import create_client

class DedupPipeline:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.sb = create_client(supabase_url, supabase_key)
        self._seen_ids: set[str] = set()

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            supabase_url=crawler.settings["SUPABASE_URL"],
            supabase_key=crawler.settings["SUPABASE_SERVICE_KEY"],
        )

    def open_spider(self, spider):
        # Load existing IDs into memory for fast dedup
        result = self.sb.table("jobs").select("id").execute()
        self._seen_ids = {row["id"] for row in (result.data or [])}
        spider.logger.info(f"DedupPipeline: loaded {len(self._seen_ids)} existing job IDs")

    def process_item(self, item, spider):
        if item["id"] in self._seen_ids:
            raise DropItem(f"Duplicate job: {item['id']}")
        self._seen_ids.add(item["id"])
        return item
