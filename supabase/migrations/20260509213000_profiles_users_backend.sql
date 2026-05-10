begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nickname text not null,
  team_id text not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  onboarding_completed boolean not null default false,
  token_version integer not null default 1,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles
  alter column id set default gen_random_uuid();

alter table public.profiles
  add column if not exists token_version integer,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.profiles
set token_version = 1
where token_version is null;

update public.profiles
set updated_at = created_at
where updated_at is null;

alter table public.profiles
  alter column token_version set default 1,
  alter column token_version set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.profiles
  drop constraint if exists profiles_email_key,
  drop constraint if exists profiles_nickname_key;

create unique index if not exists ux_profiles_email_active
  on public.profiles (lower(email))
  where deleted_at is null;

create unique index if not exists ux_profiles_nickname_active
  on public.profiles (lower(nickname))
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

commit;
