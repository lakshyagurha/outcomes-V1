-- Every source starts disabled. Turn one on only after its terms have been checked (see README → Idea Bank).
insert into public.idea_sources (slug, name, homepage_url) values
  ('fix-my-itch', 'Razorpay Fix My Itch', 'https://razorpay.com/m/fix-my-itch/'),
  ('ideabrowser', 'IdeaBrowser', 'https://www.ideabrowser.com/'),
  ('trustmrr', 'TrustMRR', 'https://trustmrr.com/'),
  ('research-report', 'Research reports', 'https://example.invalid/admin-pasted')
on conflict (slug) do nothing;
