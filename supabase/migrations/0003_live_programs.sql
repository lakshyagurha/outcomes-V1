-- Live program data: status, eligibility, posters, per-field verification,
-- plus the ingestion pipeline tables (sources → snapshots → proposals → changes).

alter table public.programs
  add column status text not null default 'unknown'
    check (status in ('open','rolling','closed','upcoming','unknown')),
  add column opens_at date,
  add column cohort_name text,
  add column eligibility jsonb not null default '{}'::jsonb,
  add column poster_url text,
  add column poster_source_url text,
  add column field_meta jsonb not null default '{}'::jsonb;

create table public.program_sources (
  id bigint generated always as identity primary key,
  program_id text not null references public.programs (id) on delete cascade,
  url text not null,
  kind text not null default 'official' check (kind in ('official','portal','aggregator','news')),
  tier smallint not null default 1,
  cadence text not null default 'daily' check (cadence in ('daily','weekly')),
  active boolean not null default true,
  last_hash text,
  last_fetched_at timestamptz,
  last_status text,
  unique (program_id, url)
);
create index program_sources_program_idx on public.program_sources (program_id);

create table public.program_snapshots (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.program_sources (id) on delete cascade,
  content_hash text not null,
  markdown text not null,
  og_image text,
  fetched_at timestamptz not null default now()
);
create index program_snapshots_source_idx on public.program_snapshots (source_id, fetched_at desc);

create table public.program_update_proposals (
  id bigint generated always as identity primary key,
  program_id text not null references public.programs (id) on delete cascade,
  source_id bigint references public.program_sources (id) on delete set null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  quote text,
  source_url text not null,
  confidence real not null default 0,
  flags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index program_update_proposals_pending_idx on public.program_update_proposals (status, created_at desc);
create index program_update_proposals_program_idx on public.program_update_proposals (program_id);
create index program_update_proposals_source_idx on public.program_update_proposals (source_id);

create table public.program_changes (
  id bigint generated always as identity primary key,
  program_id text not null references public.programs (id) on delete cascade,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  source_url text,
  changed_by text not null,         -- admin email, or 'system'
  proposal_id bigint references public.program_update_proposals (id) on delete set null,
  created_at timestamptz not null default now()
);
create index program_changes_program_idx on public.program_changes (program_id, created_at desc);
create index program_changes_proposal_idx on public.program_changes (proposal_id);

-- Pipeline tables are written by the server (service role) only; RLS on with no policies = no client access.
alter table public.program_sources enable row level security;
alter table public.program_snapshots enable row level security;
alter table public.program_update_proposals enable row level security;
alter table public.program_changes enable row level security;
-- The public "What changed" feed can read approved changes.
create policy "changes are public" on public.program_changes for select to anon, authenticated using (true);

-- One official source per program from its application link.
insert into public.program_sources (program_id, url, kind, tier, cadence)
select id, application_link, 'official', 1, 'daily' from public.programs where application_link <> ''
on conflict do nothing;
