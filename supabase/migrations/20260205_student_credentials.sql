create table if not exists public.student_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_credentials add column if not exists password text;
alter table public.student_credentials add column if not exists created_at timestamptz not null default now();
alter table public.student_credentials add column if not exists updated_at timestamptz not null default now();

create or replace function public.student_credentials_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_credentials_set_updated_at on public.student_credentials;
create trigger student_credentials_set_updated_at
before update on public.student_credentials
for each row
execute function public.student_credentials_set_updated_at();

create or replace function public.support_is_master_only()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) in ('01005209667', '0005209667')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.student_id in ('01005209667', '0005209667')
  );
$$;

alter table public.student_credentials enable row level security;

revoke all on table public.student_credentials from public;
grant select, insert, update, delete on table public.student_credentials to authenticated;

drop policy if exists student_credentials_insert_self on public.student_credentials;
create policy student_credentials_insert_self
on public.student_credentials
for insert
with check (auth.uid() = user_id);

drop policy if exists student_credentials_select_master_only on public.student_credentials;
create policy student_credentials_select_master_only
on public.student_credentials
for select
using (public.support_is_master_only());

drop policy if exists student_credentials_update_master_only on public.student_credentials;
create policy student_credentials_update_master_only
on public.student_credentials
for update
using (public.support_is_master_only())
with check (public.support_is_master_only());

drop policy if exists student_credentials_delete_master_only on public.student_credentials;
create policy student_credentials_delete_master_only
on public.student_credentials
for delete
using (public.support_is_master_only());
