-- Starter Story: added disabled. Terms allow re-publishing data only for non-commercial use, with a link back on every screen.
insert into public.idea_sources (slug, name, homepage_url, collection_mode, terms_checked_at, terms_notes) values
  ('starter-story', 'Starter Story', 'https://www.starterstory.com/data', 'disabled', now(),
   'robots.txt allows all but /admin. ToU: re-publish data only for non-commercial use; link back on every screen. Most data is behind a paid login: collect only the public /data page, never member-only content.')
on conflict (slug) do nothing;
