-- Fix RLS recursion issue in profiles table
-- Drop the problematic policy first
drop policy if exists profiles_select_admin on public.profiles;

-- Recreate the function to avoid recursion
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
  -- This query bypasses RLS because of security definer
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

-- Recreate the policy using the function
create policy profiles_select_admin
on public.profiles
for select
using (public.profiles_is_admin_or_master());

-- Also add update and insert policies for admin
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
using (public.profiles_is_admin_or_master())
with check (public.profiles_is_admin_or_master());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
with check (public.profiles_is_admin_or_master());

