-- Logo and brand colour, captured from each program's official site by the pipeline (Firecrawl "branding").
alter table public.programs
  add column logo_url text,
  add column brand_color text check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
