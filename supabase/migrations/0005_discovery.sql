-- Discovery: find programs we don't know about yet (directory crawls + search sweeps).

create table public.discovery_sources (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('directory','search')),
  label text not null,
  target text not null,              -- URL for directories, query text for searches
  cadence text not null default 'weekly' check (cadence in ('daily','weekly')),
  active boolean not null default true,
  last_hash text,
  last_run_at timestamptz,
  last_status text,
  unique (kind, target)
);

create table public.program_candidates (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,   -- normalised domain + name
  name text not null,
  organisation text,
  url text not null,
  type text check (type in ('grant','incubator','accelerator','competition','investor')),
  summary text,
  stages_accepted text[] not null default '{}',
  sectors text[] not null default '{}',
  what_they_look_for text[] not null default '{}',
  deadline date,
  quote text,
  confidence real not null default 0,
  discovery_source_id bigint references public.discovery_sources (id) on delete set null,
  found_on text not null,            -- page or search result where we saw it
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  program_id text references public.programs (id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index program_candidates_status_idx on public.program_candidates (status, created_at desc);
create index program_candidates_source_idx on public.program_candidates (discovery_source_id);
create index program_candidates_program_idx on public.program_candidates (program_id);

alter table public.discovery_sources enable row level security;
alter table public.program_candidates enable row level security;

insert into public.discovery_sources (kind, label, target, cadence) values
  ('directory', 'Startup India · programs & challenges', 'https://www.startupindia.gov.in/content/sih/en/ams-application/application-listing.html', 'weekly'),
  ('directory', 'Startup India · government schemes', 'https://www.startupindia.gov.in/content/sih/en/government-schemes.html', 'weekly'),
  ('directory', 'MeitY Startup Hub', 'https://msh.meity.gov.in/', 'weekly'),
  ('directory', 'Atal Innovation Mission', 'https://www.aim.gov.in/', 'weekly'),
  ('directory', 'BIRAC · calls for proposals', 'https://birac.nic.in/cfp.php', 'weekly'),
  ('directory', 'Startup Grants India', 'https://www.startupgrantsindia.com/', 'weekly'),
  ('directory', 'Unstop · opportunities', 'https://unstop.com/all-opportunities', 'weekly'),
  ('directory', 'Devfolio · hackathons', 'https://devfolio.co/hackathons', 'weekly'),
  ('search', 'Incubators open', 'incubation program applications open India startups', 'daily'),
  ('search', 'Accelerator cohorts', 'accelerator cohort applications open India early-stage startups', 'daily'),
  ('search', 'Pre-incubation', 'pre-incubation program applications open India students', 'daily'),
  ('search', 'Student grants', 'grant for student startups India apply now', 'daily'),
  ('search', 'First cohorts', 'launches first cohort startup accelerator India', 'daily'),
  ('search', 'Competitions', 'business plan competition ideathon India college students 2026', 'daily'),
  ('search', 'Government challenges', 'startup challenge government of India applications invited', 'daily'),
  ('search', 'Women founders', 'women founders startup program India applications open', 'daily');
