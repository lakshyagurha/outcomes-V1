-- Ideas an admin spots elsewhere (a tweet, an article, a conversation) and pastes in by hand.
-- Rewritten in our words like any other source; the original link is kept as source_url.
insert into public.idea_sources (slug, name, homepage_url, collection_mode, terms_checked_at, terms_notes) values
  ('manual', 'Curated by Outcomes', 'https://example.invalid/manual', 'rewrite', now(),
   'Admin-pasted posts and notes. Only short facts are kept, rewritten, with a link to the original post.')
on conflict (slug) do nothing;
