-- Modes confirmed by the product owner on 2026-10-20 after the compliance review (README → Idea Bank).
update public.idea_sources set collection_mode = 'rewrite', terms_checked_at = now(),
  terms_notes = 'robots.txt allows all agents incl. AI input (crawl-delay 1). No site ToU found; merchant terms silent on scraping. Rewrite + attribute + link.' where slug = 'fix-my-itch';
update public.idea_sources set collection_mode = 'disabled', terms_checked_at = now(),
  terms_notes = 'Bot challenge blocks automated access; terms unreadable; paid content. Revisit after reading terms manually.' where slug = 'ideabrowser';
update public.idea_sources set collection_mode = 'disabled', terms_checked_at = now(),
  terms_notes = 'ToU §9: customer-facing use of API data needs prior written permission; scraping banned. Enable only after written permission.' where slug = 'trustmrr';
update public.idea_sources set collection_mode = 'rewrite', terms_checked_at = now(),
  terms_notes = 'Admin checks each report''s terms when pasting. Rewrite + cite the report.' where slug = 'research-report';
-- Remove the SAMPLE design data from 0009.
delete from public.ideas where source_key like 'sample-%';
