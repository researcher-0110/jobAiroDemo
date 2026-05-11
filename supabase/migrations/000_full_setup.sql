-- ============================================================
-- JobAiro — Full Setup (tables + RLS + seed data)
-- Run once in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS + ON CONFLICT DO NOTHING
-- ============================================================

-- ─── 1. TABLES ───────────────────────────────────────────────

create table if not exists public.jobs (
  id           text primary key,
  title        text not null,
  company      text not null,
  location     text not null default '',
  type         text check (type in ('full-time','part-time','contract','remote')),
  salary_min   integer,
  salary_max   integer,
  description  text not null default '',
  apply_url    text not null,
  ats_source   text not null,
  board_url    text not null,
  posted_at    timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.user_job_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_id     text not null references public.jobs(id) on delete cascade,
  action     text not null check (action in ('save','hide','apply','report')),
  created_at timestamptz not null default now(),
  unique(user_id, job_id, action)
);

create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'search_impression','job_click','apply_click',
    'view_duration','search_query','alert_creation'
  )),
  job_id     text references public.jobs(id) on delete set null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ats_boards (
  id         uuid primary key default gen_random_uuid(),
  company    text not null,
  board_url  text not null unique,
  ats_type   text not null,
  active     boolean not null default true,
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.job_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  keyword    text,
  location   text,
  type       text,
  salary_min integer,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── 2. INDEXES ──────────────────────────────────────────────

create index if not exists idx_jobs_title      on public.jobs using gin(to_tsvector('english', title));
create index if not exists idx_jobs_company    on public.jobs (company);
create index if not exists idx_jobs_location   on public.jobs (location);
create index if not exists idx_jobs_posted_at  on public.jobs (posted_at desc);
create index if not exists idx_jobs_ats_source on public.jobs (ats_source);

create index if not exists idx_user_job_actions_user on public.user_job_actions (user_id);
create index if not exists idx_user_job_actions_job  on public.user_job_actions (job_id);

create index if not exists idx_analytics_user    on public.analytics_events (user_id);
create index if not exists idx_analytics_type    on public.analytics_events (event_type);
create index if not exists idx_analytics_created on public.analytics_events (created_at desc);

create index if not exists idx_job_alerts_user on public.job_alerts (user_id);

-- ─── 3. ROW LEVEL SECURITY ───────────────────────────────────

alter table public.jobs             enable row level security;
alter table public.user_job_actions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.job_alerts       enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='jobs' and policyname='Public read jobs'
  ) then
    create policy "Public read jobs" on public.jobs for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='user_job_actions' and policyname='Own actions read'
  ) then
    create policy "Own actions read" on public.user_job_actions
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='user_job_actions' and policyname='Own actions insert'
  ) then
    create policy "Own actions insert" on public.user_job_actions
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='analytics_events' and policyname='Own analytics read'
  ) then
    create policy "Own analytics read" on public.analytics_events
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='job_alerts' and policyname='Own alerts all'
  ) then
    create policy "Own alerts all" on public.job_alerts
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 4. ATS BOARDS SEED ──────────────────────────────────────

insert into public.ats_boards (company, board_url, ats_type, active) values
  ('Shopify',  'https://boards.greenhouse.io/shopify',  'greenhouse', true),
  ('Stripe',   'https://boards.greenhouse.io/stripe',   'greenhouse', true),
  ('Airbnb',   'https://boards.greenhouse.io/airbnb',   'greenhouse', true),
  ('Figma',    'https://jobs.lever.co/figma',           'lever',      true),
  ('Netflix',  'https://jobs.lever.co/netflix',         'lever',      true),
  ('Notion',   'https://jobs.lever.co/notion',          'lever',      true),
  ('Linear',   'https://jobs.lever.co/linear',          'lever',      true),
  ('Vercel',   'https://jobs.lever.co/vercel',          'lever',      true),
  ('Rippling', 'https://jobs.lever.co/rippling',        'lever',      true),
  ('Apple',    'https://apple.wd1.myworkdayjobs.com',   'workday',    true)
on conflict (board_url) do nothing;

-- ─── 5. JOBS SEED ────────────────────────────────────────────

insert into public.jobs (id, title, company, location, type, salary_min, salary_max, description, apply_url, ats_source, board_url, posted_at) values

(
  'gh_shopify_sre_001',
  'Senior Site Reliability Engineer',
  'Shopify',
  'Remote — Canada',
  'full-time', 140000, 185000,
  'Shopify is looking for a Senior SRE to help scale infrastructure that powers millions of merchants worldwide. You will design and operate highly available distributed systems, drive incident response, and build internal tooling to improve developer productivity.

Responsibilities:
- Own reliability and scalability of core platform services
- Design and implement observability pipelines (metrics, logs, traces)
- Lead blameless post-mortems and drive actionable follow-ups
- Partner with product engineering teams on launch readiness

Requirements:
- 5+ years of SRE or infrastructure engineering experience
- Strong proficiency in Go or Python
- Deep experience with Kubernetes, Terraform, and cloud platforms (GCP/AWS)
- Experience with distributed systems and database operations at scale',
  'https://boards.greenhouse.io/shopify/jobs/sre-001',
  'greenhouse', 'https://boards.greenhouse.io/shopify',
  now() - interval '1 day'
),

(
  'gh_shopify_fe_002',
  'Staff Frontend Engineer — Checkout',
  'Shopify',
  'Remote — Worldwide',
  'full-time', 160000, 210000,
  'Join Shopify''s Checkout team and work on the most performance-critical surface in e-commerce. Millions of buyers complete purchases through Shopify Checkout every day — your work will directly impact conversion and revenue for merchants globally.

Responsibilities:
- Lead frontend architecture decisions for the Checkout product
- Drive performance optimisations (Core Web Vitals, bundle size, runtime)
- Mentor engineers across the frontend discipline
- Collaborate with design and product on new checkout experiences

Requirements:
- 8+ years of frontend engineering experience
- Expert-level JavaScript, TypeScript, React
- Deep understanding of browser rendering and performance profiling
- Experience with A/B testing infrastructure at scale',
  'https://boards.greenhouse.io/shopify/jobs/fe-002',
  'greenhouse', 'https://boards.greenhouse.io/shopify',
  now() - interval '2 days'
),

(
  'gh_stripe_be_003',
  'Backend Engineer — Payments Infrastructure',
  'Stripe',
  'San Francisco, CA / Remote',
  'full-time', 175000, 230000,
  'Stripe''s Payments Infrastructure team builds the core systems that process hundreds of billions of dollars in transactions annually. We are looking for a backend engineer passionate about reliability, correctness, and scale.

Responsibilities:
- Design and build payment processing systems handling millions of requests per second
- Ensure financial correctness and auditability across all transaction flows
- Collaborate across API, risk, and compliance teams
- Drive technical strategy for next-generation payment infrastructure

Requirements:
- 5+ years of backend engineering experience
- Experience with high-throughput, low-latency distributed systems
- Strong understanding of data consistency and transaction semantics
- Proficiency in Java, Go, or Ruby',
  'https://boards.greenhouse.io/stripe/jobs/be-003',
  'greenhouse', 'https://boards.greenhouse.io/stripe',
  now() - interval '3 days'
),

(
  'gh_stripe_ml_004',
  'Machine Learning Engineer — Fraud Detection',
  'Stripe',
  'Remote — US',
  'full-time', 180000, 240000,
  'Stripe Radar is our fraud detection system protecting businesses from fraudulent transactions. We are hiring ML engineers to improve the models and infrastructure powering real-time fraud prevention at global scale.

Responsibilities:
- Build and iterate on ML models for fraud and risk detection
- Design feature pipelines for real-time model inference
- Run experiments and measure impact on fraud rates and false positives
- Partner with engineering to deploy models into production

Requirements:
- 4+ years of ML engineering or applied ML research experience
- Strong Python skills; experience with PyTorch or TensorFlow
- Experience with large-scale feature engineering and model serving
- Background in anomaly detection or fraud/risk domains is a plus',
  'https://boards.greenhouse.io/stripe/jobs/ml-004',
  'greenhouse', 'https://boards.greenhouse.io/stripe',
  now() - interval '4 days'
),

(
  'lv_figma_pm_005',
  'Product Manager — Collaboration',
  'Figma',
  'San Francisco, CA',
  'full-time', 155000, 195000,
  'Figma is looking for a PM to own the Collaboration product surface — multiplayer editing, comments, branching, and co-presence features used by millions of designers and developers daily.

Responsibilities:
- Define and own the product roadmap for real-time collaboration features
- Work closely with engineering and design to ship high-quality experiences
- Analyse usage data and run user research to identify opportunities
- Partner with enterprise sales on collaboration features for large orgs

Requirements:
- 4+ years of product management experience in a B2B or SaaS product
- Track record of shipping impactful features used by large audiences
- Strong analytical skills; comfort with SQL and product analytics tools
- Excellent communication and stakeholder management',
  'https://jobs.lever.co/figma/pm-005',
  'lever', 'https://jobs.lever.co/figma',
  now() - interval '1 day'
),

(
  'lv_figma_ios_006',
  'iOS Engineer — Mobile Editor',
  'Figma',
  'Remote — US / Canada',
  'full-time', 145000, 190000,
  'Join Figma''s mobile team to build the next generation of design tooling on iOS. You will work on a complex, performance-sensitive editor that brings professional design capabilities to iPhone and iPad.

Responsibilities:
- Build and maintain the Figma iOS application
- Optimise rendering performance for complex design documents
- Collaborate with the platform team on shared editor infrastructure
- Drive adoption of modern iOS APIs and SwiftUI patterns

Requirements:
- 4+ years of iOS development experience
- Expert-level Swift; experience with UIKit and SwiftUI
- Experience with graphics programming (Core Animation, Metal) is a strong plus
- Passion for crafting polished, performant mobile experiences',
  'https://jobs.lever.co/figma/ios-006',
  'lever', 'https://jobs.lever.co/figma',
  now() - interval '5 days'
),

(
  'lv_netflix_de_007',
  'Senior Data Engineer — Personalisation',
  'Netflix',
  'Los Gatos, CA',
  'full-time', 185000, 250000,
  'Netflix''s Personalisation team is responsible for the algorithms that decide what 270 million members see when they open the app. We are looking for a Senior Data Engineer to build and maintain the data infrastructure powering our recommendation systems.

Responsibilities:
- Build scalable data pipelines ingesting billions of viewing events per day
- Maintain feature stores and training datasets for recommendation models
- Partner with ML researchers to productionise new personalisation signals
- Drive data quality and observability across the personalisation data platform

Requirements:
- 6+ years of data engineering experience
- Expert knowledge of Spark, Flink, or similar distributed processing frameworks
- Experience with large-scale data warehouses (Iceberg, Hive, Redshift)
- Ability to collaborate effectively with ML and product teams',
  'https://jobs.lever.co/netflix/de-007',
  'lever', 'https://jobs.lever.co/netflix',
  now() - interval '2 days'
),

(
  'lv_notion_fullstack_008',
  'Full-Stack Engineer — Core Product',
  'Notion',
  'Remote — Worldwide',
  'full-time', 140000, 185000,
  'Notion''s Core Product team builds the foundation of the Notion editor — blocks, databases, pages, and the primitives that power everything else. We are looking for a full-stack engineer who cares deeply about product quality and engineering craft.

Responsibilities:
- Build and maintain core editor features used by millions daily
- Work across the stack: React/TypeScript on the frontend, Node.js on the backend
- Improve performance and reliability of the Notion document model
- Collaborate with design on new user-facing product experiences

Requirements:
- 3+ years of full-stack product engineering experience
- Strong proficiency in TypeScript, React, Node.js
- Experience with real-time collaborative editing is a plus
- Product sensibility and attention to detail',
  'https://jobs.lever.co/notion/fullstack-008',
  'lever', 'https://jobs.lever.co/notion',
  now() - interval '6 days'
),

(
  'gh_airbnb_design_009',
  'Senior Product Designer — Host Experience',
  'Airbnb',
  'Remote — US',
  'full-time', 145000, 195000,
  'Airbnb''s Host Experience team is looking for a Senior Product Designer to shape how hosts manage their listings, pricing, and guest communications. You will own end-to-end design for high-impact surfaces used by millions of hosts globally.

Responsibilities:
- Lead design for host-facing tools including calendar, pricing, and inbox
- Conduct user research with hosts across different markets and property types
- Collaborate with PMs and engineers to ship polished, intuitive experiences
- Contribute to Airbnb''s design system and shared component library

Requirements:
- 5+ years of product design experience in a consumer or marketplace product
- Strong portfolio demonstrating complex interaction and systems design
- Experience running user research and translating insights into product decisions
- Proficiency in Figma',
  'https://boards.greenhouse.io/airbnb/jobs/design-009',
  'greenhouse', 'https://boards.greenhouse.io/airbnb',
  now() - interval '3 days'
),

(
  'lv_linear_be_010',
  'Backend Engineer — Sync Engine',
  'Linear',
  'Remote — Worldwide',
  'full-time', 150000, 200000,
  'Linear''s Sync Engine powers real-time collaboration across our issue tracker — keeping data consistent and up-to-date for teams around the world. We are looking for a backend engineer excited about distributed systems, correctness, and developer tooling.

Responsibilities:
- Build and maintain the real-time sync infrastructure powering Linear
- Optimise for low latency and high consistency across concurrent users
- Work on database layer: PostgreSQL query optimisation, indexing, migrations
- Contribute to the open-source parts of our sync engine

Requirements:
- 4+ years of backend engineering experience
- Deep understanding of distributed systems and consistency models
- Strong PostgreSQL skills including query planning and performance tuning
- Experience with TypeScript/Node.js',
  'https://jobs.lever.co/linear/be-010',
  'lever', 'https://jobs.lever.co/linear',
  now() - interval '1 day'
),

(
  'lv_vercel_devrel_011',
  'Developer Advocate — Next.js',
  'Vercel',
  'Remote — Worldwide',
  'full-time', 120000, 160000,
  'Vercel is looking for a Developer Advocate to champion Next.js and the Vercel platform to millions of developers. You will create content, engage the community, and help developers build better web experiences.

Responsibilities:
- Create high-quality technical content: blog posts, videos, demos, conference talks
- Represent Vercel at developer conferences and community events
- Gather developer feedback and act as the voice of the community internally
- Build and maintain example applications showcasing Next.js features

Requirements:
- 3+ years of software engineering experience with strong Next.js knowledge
- Proven track record of technical content creation (blog, YouTube, speaking)
- Strong communication skills; ability to explain complex topics simply
- Active presence in the Next.js / React / web dev community',
  'https://jobs.lever.co/vercel/devrel-011',
  'lever', 'https://jobs.lever.co/vercel',
  now() - interval '4 days'
),

(
  'lv_rippling_sec_012',
  'Security Engineer — Application Security',
  'Rippling',
  'San Francisco, CA / Remote',
  'full-time', 160000, 215000,
  'Rippling''s Security team protects the HR, IT, and Finance platform trusted by thousands of companies to manage their workforce. We are hiring an Application Security Engineer to lead secure-by-default engineering practices across our product.

Responsibilities:
- Conduct security design reviews and threat modelling for new product features
- Build and maintain security tooling integrated into the development lifecycle
- Lead penetration testing and red team exercises
- Triage and remediate vulnerabilities reported via the bug bounty programme

Requirements:
- 5+ years of application security engineering experience
- Strong understanding of web application security (OWASP Top 10, auth patterns)
- Experience with security code review in Python or TypeScript/Node.js
- Familiarity with cloud security (AWS IAM, network policies)',
  'https://jobs.lever.co/rippling/sec-012',
  'lever', 'https://jobs.lever.co/rippling',
  now() - interval '7 days'
),

(
  'gh_stripe_contract_013',
  'API Documentation Engineer (Contract)',
  'Stripe',
  'Remote — Worldwide',
  'contract', 80000, 110000,
  'Stripe is looking for a contract API Documentation Engineer to help improve and expand our developer-facing API reference documentation. This is a 6-month contract with possibility of extension.

Responsibilities:
- Audit and rewrite existing API reference documentation for clarity and accuracy
- Work with engineering to document new API endpoints and SDKs
- Develop code samples in multiple languages (Node, Python, Ruby, Go, Java)
- Contribute to documentation tooling and workflow improvements

Requirements:
- Strong technical writing skills with experience documenting REST APIs
- Ability to read and write code in at least 2 languages
- Experience with OpenAPI/Swagger specifications
- Familiarity with developer experience best practices',
  'https://boards.greenhouse.io/stripe/jobs/contract-013',
  'greenhouse', 'https://boards.greenhouse.io/stripe',
  now() - interval '2 days'
),

(
  'lv_notion_pt_014',
  'Part-Time Community Manager',
  'Notion',
  'Remote — US',
  'part-time', 45000, 60000,
  'Notion is hiring a part-time Community Manager to help grow and nurture our user community across Reddit, Twitter/X, Discord, and the Notion Ambassador programme. Approximately 20 hours per week.

Responsibilities:
- Moderate and engage in the Notion community on Reddit and Discord
- Source and amplify user-generated content and creative Notion use cases
- Support the Ambassador programme — onboarding and recognising top contributors
- Report community sentiment and feedback to the product team

Requirements:
- 1–2 years of community management or social media experience
- Passionate Notion user with deep product knowledge
- Excellent written communication skills
- Ability to work autonomously and manage your own schedule',
  'https://jobs.lever.co/notion/pt-014',
  'lever', 'https://jobs.lever.co/notion',
  now() - interval '5 days'
),

(
  'lv_figma_remote_015',
  'Engineering Manager — Developer Platform',
  'Figma',
  'Remote — Worldwide',
  'remote', 195000, 260000,
  'Figma''s Developer Platform team builds the APIs, plugins, and widgets ecosystem that extends Figma for thousands of third-party developers and enterprise customers. We are looking for an Engineering Manager to lead this team.

Responsibilities:
- Lead a team of 6–8 engineers building public APIs and developer tooling
- Set technical direction for the Developer Platform roadmap
- Partner with Product, Design, and Developer Relations on ecosystem growth
- Hire, grow, and retain exceptional engineering talent

Requirements:
- 3+ years of engineering management experience
- Strong technical background in API design and platform engineering
- Experience growing developer ecosystems or marketplace products
- Excellent communication and people skills; experience managing remote teams',
  'https://jobs.lever.co/figma/remote-015',
  'lever', 'https://jobs.lever.co/figma',
  now() - interval '1 day'
)

on conflict (id) do update set
  title       = excluded.title,
  company     = excluded.company,
  location    = excluded.location,
  type        = excluded.type,
  salary_min  = excluded.salary_min,
  salary_max  = excluded.salary_max,
  description = excluded.description,
  apply_url   = excluded.apply_url,
  posted_at   = excluded.posted_at;
