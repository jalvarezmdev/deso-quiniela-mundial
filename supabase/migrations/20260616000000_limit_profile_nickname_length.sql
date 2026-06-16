begin;

alter table public.profiles
  add constraint chk_profiles_nickname_length
  check (char_length(nickname) <= 50);

commit;
