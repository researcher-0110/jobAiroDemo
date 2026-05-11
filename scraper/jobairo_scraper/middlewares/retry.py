import time
import random
from scrapy.downloadermiddlewares.retry import RetryMiddleware
from scrapy.utils.response import response_status_message

class SmartRetryMiddleware(RetryMiddleware):
    RETRY_HTTP_CODES = {500, 502, 503, 504, 408, 429}

    def process_response(self, request, response, spider):
        if response.status in self.RETRY_HTTP_CODES:
            retry_count = request.meta.get("retry_times", 0)
            wait = min(2 ** retry_count + random.uniform(0, 1), 30)
            spider.logger.warning(
                f"Retrying {request.url} (attempt {retry_count + 1}) "
                f"after {wait:.1f}s — HTTP {response.status}"
            )
            time.sleep(wait)
            reason = response_status_message(response.status)
            return self._retry(request, reason, spider) or response
        return response

    def process_exception(self, request, exception, spider):
        retry_count = request.meta.get("retry_times", 0)
        wait = min(2 ** retry_count + random.uniform(0, 1), 30)
        time.sleep(wait)
        return super().process_exception(request, exception, spider)
