.PHONY: help dev build up down logs restart scrape scrape-lever scrape-workday deploy-staging shell-backend shell-frontend

COMPOSE = docker compose
ENV_FILE = .env

help:
	@echo "JobAiro — available targets:"
	@echo "  dev             Start all services in dev mode (with hot reload)"
	@echo "  build           Build all Docker images"
	@echo "  up              Start all services (detached)"
	@echo "  down            Stop all services"
	@echo "  logs            Tail logs for all services"
	@echo "  restart         Rebuild + restart all services"
	@echo "  scrape          Run greenhouse scraper (production settings)"
	@echo "  scrape-lever    Run lever scraper"
	@echo "  scrape-workday  Run workday scraper"
	@echo "  shell-backend   Open shell in backend container"
	@echo "  shell-frontend  Open shell in frontend container"

dev:
	$(COMPOSE) up

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

restart:
	$(COMPOSE) down
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

scrape:
	$(COMPOSE) --profile scraper run --rm scraper \
		scrapy crawl greenhouse \
		--set SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production

scrape-lever:
	$(COMPOSE) --profile scraper run --rm scraper \
		scrapy crawl lever \
		--set SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production

scrape-workday:
	$(COMPOSE) --profile scraper run --rm scraper \
		scrapy crawl workday \
		--set SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production

shell-backend:
	$(COMPOSE) exec backend /bin/bash

shell-frontend:
	$(COMPOSE) exec frontend /bin/sh
