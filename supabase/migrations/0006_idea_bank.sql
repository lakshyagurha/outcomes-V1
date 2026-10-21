-- Idea Bank v1: curated problems worth solving, with sourced market data.
-- Admin writes go through the service role (admins are ADMIN_EMAILS, not a DB role), so
-- ideas and idea_sources have no write policies for regular users.

create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;

create table public.idea_sources (
  id bigint generated always as identity primary key,
  slug text not null unique,          -- 'fix-my-itch' | 'ideabrowser' | 'trustmrr' | 'research-report'
  name text not null,                 -- shown as "Source: <name>"
  homepage_url text not null,
  collection_mode text not null default 'disabled' check (collection_mode in ('rewrite','link_only','disabled')),
  terms_checked_at timestamptz,
  terms_notes text,
  last_run_at timestamptz,
  last_status text
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  who_has_it text,
  why_it_matters text,
  category text not null check (category in ('B2B Services','Beauty & Personal Care','Consumer Services','E-commerce','EdTech','FinTech','Food & Beverage','Healthtech','Home Services','Logistics','Real Estate','SaaS','Transportation','Travel','Other')),
  path text not null check (path in ('startup','small_business')),
  source_id bigint not null references public.idea_sources (id) on delete restrict,
  source_url text not null,
  source_key text not null,           -- stable id of the item at its source, so reruns don't re-insert it
  source_score numeric,
  source_score_label text,
  market_segment text,
  market_size_value numeric,
  market_size_currency text check (market_size_currency in ('INR','USD')),
  market_size_unit text,
  market_geography text,
  market_size_year int,
  growth_rate numeric,
  growth_type text check (growth_type in ('YoY','CAGR')),
  growth_period text,
  market_source_name text,
  market_source_url text,
  market_source_quote text,           -- admin verification only; never granted to students
  market_status text not null default 'pending' check (market_status in ('sourced','not_found','pending')),
  status text not null default 'draft' check (status in ('draft','published','rejected')),
  interest_count int not null default 0,
  duplicate_of uuid references public.ideas (id) on delete set null,
  duplicate_similarity real,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  reviewed_by text,
  unique (source_id, source_key)
);
create index ideas_status_idx on public.ideas (status, published_at desc);
create index ideas_source_idx on public.ideas (source_id);
create index ideas_duplicate_idx on public.ideas (duplicate_of);
create index ideas_title_trgm_idx on public.ideas using gin (title extensions.gin_trgm_ops);

create table public.idea_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, idea_id)       -- the unique (user_id, idea_id)
);
create index idea_interests_idea_idx on public.idea_interests (idea_id);

-- RLS
alter table public.idea_sources enable row level security;   -- no policies: service role only
alter table public.ideas enable row level security;
alter table public.idea_interests enable row level security;

create policy "Signed-in users read published ideas" on public.ideas
  for select to authenticated using (status = 'published');

-- Students may read every column except the admin-only ones.
revoke all on public.ideas from anon, authenticated;
grant select (id, title, summary, who_has_it, why_it_matters, category, path, source_id, source_url,
  source_score, source_score_label, market_segment, market_size_value, market_size_currency, market_size_unit,
  market_geography, market_size_year, growth_rate, growth_type, growth_period, market_source_name,
  market_source_url, market_status, status, interest_count, created_at, published_at)
  on public.ideas to authenticated;
revoke all on public.idea_sources from anon, authenticated;

create policy "Users read own interests" on public.idea_interests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add own interests" on public.idea_interests
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own interests" on public.idea_interests
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.idea_interests from anon;
grant select, insert, delete on public.idea_interests to authenticated;

-- Keep ideas.interest_count in sync. Security definer because students can't update ideas.
create function private.sync_interest_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.ideas set interest_count = interest_count + 1 where id = new.idea_id;
  else
    update public.ideas set interest_count = greatest(interest_count - 1, 0) where id = old.idea_id;
  end if;
  return null;
end $$;
revoke all on function private.sync_interest_count() from public;

create trigger idea_interests_count after insert or delete on public.idea_interests
  for each row execute function private.sync_interest_count();

-- Duplicate check for the pipeline (service role only).
create function public.similar_ideas(q text, threshold real default 0.45)
returns table (id uuid, title text, similarity real)
language sql stable set search_path = '' as $$
  select i.id, i.title, extensions.similarity(i.title, q)
  from public.ideas i
  where i.status <> 'rejected' and extensions.similarity(i.title, q) >= threshold
  order by 3 desc limit 3
$$;
revoke all on function public.similar_ideas(text, real) from public, anon, authenticated;
grant execute on function public.similar_ideas(text, real) to service_role;
