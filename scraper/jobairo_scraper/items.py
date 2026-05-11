import scrapy

class JobItem(scrapy.Item):
    id = scrapy.Field()            # unique hash: md5(company + title + apply_url)
    title = scrapy.Field()
    company = scrapy.Field()
    location = scrapy.Field()
    type = scrapy.Field()          # full-time, part-time, contract, remote
    salary_min = scrapy.Field()
    salary_max = scrapy.Field()
    description = scrapy.Field()
    apply_url = scrapy.Field()
    ats_source = scrapy.Field()    # greenhouse, lever, workday, etc.
    board_url = scrapy.Field()     # the ATS board URL this came from
    posted_at = scrapy.Field()
    created_at = scrapy.Field()
