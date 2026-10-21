-- Product decision (2026-10-21): when no published figure is entered, market fields are filled with an AI estimate,
-- stored as market_status='ai_estimate' and always labelled as such to students. Plus a short AI "snapshot":
-- a mini case study, what people earn doing this, and the main competitors.
alter table public.ideas drop constraint ideas_market_status_check;
alter table public.ideas add constraint ideas_market_status_check check (market_status in ('sourced','not_found','pending','ai_estimate'));
alter table public.ideas add column market_insights text;
grant select (market_insights) on public.ideas to authenticated;
alter table public.ideas drop constraint ideas_publish_requires_verified_market;
alter table public.ideas add constraint ideas_publish_requires_verified_market check (
  status <> 'published' or market_status in ('not_found','ai_estimate') or (market_status = 'sourced' and market_verified_at is not null)
);
