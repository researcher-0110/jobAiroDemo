import base64
from scrapy import signals
from scrapy.exceptions import NotConfigured

class RotatingProxyMiddleware:
    def __init__(self, proxy_url: str, proxy_user: str, proxy_pass: str):
        if not proxy_url:
            raise NotConfigured("PROXY_URL not set — proxy middleware disabled")
        self.proxy_url = proxy_url
        if proxy_user and proxy_pass:
            creds = base64.b64encode(f"{proxy_user}:{proxy_pass}".encode()).decode()
            self.proxy_auth = f"Basic {creds}"
        else:
            self.proxy_auth = None

    @classmethod
    def from_crawler(cls, crawler):
        proxy_url = crawler.settings.get("PROXY_URL", "")
        proxy_user = crawler.settings.get("PROXY_USER", "")
        proxy_pass = crawler.settings.get("PROXY_PASS", "")
        return cls(proxy_url, proxy_user, proxy_pass)

    def process_request(self, request, spider):
        request.meta["proxy"] = self.proxy_url
        if self.proxy_auth:
            request.headers["Proxy-Authorization"] = self.proxy_auth
