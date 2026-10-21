-- Only @ssb.scaler.com accounts can be created (covers Google OAuth and magic links).
-- Change the domain here AND in NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN if it ever changes.
create or replace function public.enforce_email_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) <> 'ssb.scaler.com' then
    raise exception 'Only @ssb.scaler.com email addresses can sign up.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_email_domain() from public, anon, authenticated;

create trigger enforce_email_domain
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_domain();
