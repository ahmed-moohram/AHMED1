-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_id text,
  phone text,
  role text not null default 'student',
  approval_status text not null default 'pending',
  approval_updated_at timestamptz,
  approval_note text,
  is_banned boolean not null default false,
  ban_reason text,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns if they don't exist
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists approval_status text not null default 'pending';
alter table public.profiles add column if not exists approval_updated_at timestamptz;
alter table public.profiles add column if not exists approval_note text;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists device_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Create unique index on student_id if it doesn't exist
create unique index if not exists profiles_student_id_unique on public.profiles(student_id) where student_id is not null;

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  user_metadata jsonb;
  user_student_id text;
  user_full_name text;
  user_phone text;
  is_admin boolean;
begin
  user_email := new.email;
  user_metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_student_id := coalesce(user_metadata->>'student_id', split_part(user_email, '@', 1));
  user_full_name := user_metadata->>'full_name';
  user_phone := user_metadata->>'phone';
  
  -- Check if user is admin/master
  is_admin := user_student_id in ('01005209667', '0005209667', '01273460425');
  
  -- Insert profile with approval_status
  insert into public.profiles (
    id,
    full_name,
    student_id,
    phone,
    role,
    approval_status,
    approval_updated_at
  ) values (
    new.id,
    user_full_name,
    user_student_id,
    user_phone,
    case when is_admin then 'admin' else 'student' end,
    case when is_admin then 'approved' else 'pending' end,
    now()
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    student_id = coalesce(excluded.student_id, profiles.student_id),
    phone = coalesce(excluded.phone, profiles.phone),
    updated_at = now();
  
  return new;
end;
$$;

-- Drop trigger if exists and create new one
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to check if user is admin/master (avoids RLS recursion)
-- Uses security definer to bypass RLS when checking profiles
create or replace function public.profiles_is_admin_or_master()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_email text;
  email_local_part text;
  user_role text;
  user_student_id text;
begin
  -- First check email from JWT (no RLS needed)
  user_email := coalesce(auth.jwt() ->> 'email', '');
  email_local_part := split_part(user_email, '@', 1);
  
  if email_local_part in ('01005209667', '0005209667', '01273460425') then
    return true;
  end if;
  
  -- Then check profile (using security definer to bypass RLS)
  select p.role, p.student_id
  into user_role, user_student_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
  
  if user_role = 'admin' or user_student_id in ('01005209667', '0005209667', '01273460425') then
    return true;
  end if;
  
  return false;
end;
$$;

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles
for select
using (public.profiles_is_admin_or_master());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
using (public.profiles_is_admin_or_master())
with check (public.profiles_is_admin_or_master());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
with check (public.profiles_is_admin_or_master());

-- Function to update updated_at
create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.profiles_set_updated_at();

-- Function to backfill profiles for existing users
create or replace function public.backfill_missing_profiles()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    student_id,
    phone,
    role,
    approval_status,
    approval_updated_at
  )
  select 
    u.id,
    coalesce((u.raw_user_meta_data->>'full_name')::text, ''),
    coalesce((u.raw_user_meta_data->>'student_id')::text, split_part(u.email, '@', 1)),
    coalesce((u.raw_user_meta_data->>'phone')::text, ''),
    case 
      when coalesce((u.raw_user_meta_data->>'student_id')::text, split_part(u.email, '@', 1)) in ('01005209667', '0005209667', '01273460425') 
      then 'admin' 
      else 'student' 
    end,
    case 
      when coalesce((u.raw_user_meta_data->>'student_id')::text, split_part(u.email, '@', 1)) in ('01005209667', '0005209667', '01273460425') 
      then 'approved' 
      else 'pending' 
    end,
    now()
  from auth.users u
  where not exists (
    select 1 from public.profiles p where p.id = u.id
  )
  on conflict (id) do nothing;
end;
$$;

-- Grant execute permission
revoke all on function public.backfill_missing_profiles() from public;
grant execute on function public.backfill_missing_profiles() to authenticated;

