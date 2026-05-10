begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists profiles_no_access on public.profiles;
create policy profiles_no_access
on public.profiles
for all
using (false)
with check (false);

commit;
