-- Outcomes MVP schema. "users" are Supabase auth.users.

create table public.programs (
  id text primary key,               -- slug, e.g. "startup-india-seed-fund"
  name text not null,
  organisation text not null,
  type text not null check (type in ('grant','incubator','accelerator','competition','investor')),
  summary text not null default '',
  stages_accepted text[] not null,
  sectors text[] not null default '{}',
  what_you_get jsonb not null,
  what_they_take jsonb not null,
  what_they_look_for text[] not null,
  fit_signals jsonb not null,
  typical_timeline text,
  deadline date,
  application_link text not null default '',
  red_flags text[] not null default '{}',
  verified boolean not null default false,
  last_checked date,
  updated_at timestamptz not null default now()
);

create table public.founder_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  diagnostic jsonb,
  stage text,
  startup_name text,
  problem text,
  solution text,
  users_spoken_to text,
  traction text,
  team text,
  sector text,
  updated_at timestamptz not null default now()
);

create table public.saved_programs (
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null references public.programs (id) on delete cascade,
  status text not null default 'interested'
    check (status in ('interested','drafting','submitted','interview','accepted','rejected')),
  deadline date,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table public.coach_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null references public.programs (id) on delete cascade,
  question text not null,
  draft text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);
create index coach_reviews_user_created_idx on public.coach_reviews (user_id, created_at desc);
create index saved_programs_program_idx on public.saved_programs (program_id);
create index coach_reviews_program_idx on public.coach_reviews (program_id);

-- Row level security
alter table public.programs enable row level security;
alter table public.founder_profiles enable row level security;
alter table public.saved_programs enable row level security;
alter table public.coach_reviews enable row level security;

create policy "programs are public" on public.programs for select to anon, authenticated using (true);

create policy "own profile" on public.founder_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own saved programs" on public.saved_programs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own coach reviews" on public.coach_reviews for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
