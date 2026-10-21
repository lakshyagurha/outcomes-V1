-- An admin ticks "figure checked against quote" before an idea with a sourced figure can be published.
alter table public.ideas add column market_verified_at timestamptz, add column market_verified_by text;
update public.ideas set market_verified_at = now(), market_verified_by = 'SAMPLE' where source_key like 'sample-%' and market_status = 'sourced';
-- Never publish a pending or unverified figure. not_found may be published.
alter table public.ideas add constraint ideas_publish_requires_verified_market check (
  status <> 'published' or market_status = 'not_found' or (market_status = 'sourced' and market_verified_at is not null)
);
