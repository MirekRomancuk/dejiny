-- 0004_profiles.sql
-- User profiles + is_admin flag. Trigger auto-creates profile row on signup.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

-- Helper: is the current authed user an admin?
create or replace function public.is_admin() returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Trigger: on new auth.users INSERT, create matching profile (default is_admin=false)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS for profiles
alter table public.profiles enable row level security;

-- Anyone authenticated can read their own profile (to discover is_admin status)
create policy "profiles_read_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admins can read ALL profiles (for the users management page)
create policy "profiles_read_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- Admins can update profiles (toggle is_admin flag etc.)
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Backfill existing auth.users (if any) into profiles
insert into public.profiles (id, email, is_admin)
select id, email, false from auth.users
on conflict (id) do nothing;
