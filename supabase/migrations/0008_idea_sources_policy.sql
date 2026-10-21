-- Make "admins only" explicit (admins use the service role, which bypasses RLS).
create policy "No direct access; service role only" on public.idea_sources
  as restrictive for all to anon, authenticated using (false) with check (false);
