-- Idea tracker: students move an interested idea through research to a final pick.
alter table public.idea_interests
  add column stage text not null default 'interested'
    check (stage in ('interested','researching','talking_to_users','validating','finalized','dropped')),
  add column users_spoken int not null default 0 check (users_spoken >= 0),
  add column notes text not null default '',
  add column updated_at timestamptz not null default now();

create policy "Users update own interests" on public.idea_interests
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant update (stage, users_spoken, notes, updated_at) on public.idea_interests to authenticated;
