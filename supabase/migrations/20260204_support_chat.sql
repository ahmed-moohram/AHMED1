create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_body text,
  last_sender_role text,
  last_sender_id uuid,
  unread_user integer not null default 0,
  unread_admin integer not null default 0,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  is_closed boolean not null default false
);

alter table public.support_conversations add column if not exists last_message_body text;
alter table public.support_conversations add column if not exists last_sender_role text;
alter table public.support_conversations add column if not exists last_sender_id uuid;
alter table public.support_conversations add column if not exists unread_user integer not null default 0;
alter table public.support_conversations add column if not exists unread_admin integer not null default 0;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_created_at_idx on public.support_messages(conversation_id, created_at);

create or replace function public.support_is_admin_or_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or p.student_id in ('01005209667', '0005209667')
        or split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1) in ('01005209667', '0005209667')
      )
  );
$$;

create or replace function public.support_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.support_guard_student_conversation_updates()
returns trigger
language plpgsql
as $$
begin
  if not public.support_is_admin_or_master() then
    new.user_id = old.user_id;
    new.is_closed = old.is_closed;

    new.last_message_at = old.last_message_at;
    new.last_message_body = old.last_message_body;
    new.last_sender_role = old.last_sender_role;
    new.last_sender_id = old.last_sender_id;

    new.unread_admin = old.unread_admin;
    new.admin_last_read_at = old.admin_last_read_at;
  end if;
  return new;
end;
$$;

drop trigger if exists support_conversations_set_updated_at on public.support_conversations;
drop trigger if exists support_conversations_00_guard_student_updates on public.support_conversations;

create trigger support_conversations_00_guard_student_updates
before update on public.support_conversations
for each row
execute function public.support_guard_student_conversation_updates();

create trigger support_conversations_set_updated_at
before update on public.support_conversations
for each row
execute function public.support_set_updated_at();

create or replace function public.support_touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.support_conversations
    set last_message_at = new.created_at,
        last_message_body = new.body,
        last_sender_role = new.sender_role,
        last_sender_id = new.sender_id,
        unread_admin = case when new.sender_role = 'student' then unread_admin + 1 else unread_admin end,
        unread_user = case when new.sender_role = 'admin' then unread_user + 1 else unread_user end,
        updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists support_messages_touch_conversation on public.support_messages;
create trigger support_messages_touch_conversation
after insert on public.support_messages
for each row
execute function public.support_touch_conversation();

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select
on public.support_conversations
for select
using (auth.uid() = user_id or public.support_is_admin_or_master());

drop policy if exists support_conversations_insert on public.support_conversations;
create policy support_conversations_insert
on public.support_conversations
for insert
with check (auth.uid() = user_id);

drop policy if exists support_conversations_update on public.support_conversations;
create policy support_conversations_update
on public.support_conversations
for update
using (auth.uid() = user_id or public.support_is_admin_or_master())
with check (auth.uid() = user_id or public.support_is_admin_or_master());

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select
on public.support_messages
for select
using (
  exists (
    select 1
    from public.support_conversations c
    where c.id = support_messages.conversation_id
      and (c.user_id = auth.uid() or public.support_is_admin_or_master())
  )
);

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert
on public.support_messages
for insert
with check (
  sender_id = auth.uid()
  and (
    (sender_role = 'student' and exists (select 1 from public.support_conversations c where c.id = support_messages.conversation_id and c.user_id = auth.uid()))
    or
    (sender_role = 'admin' and public.support_is_admin_or_master())
  )
);

create table if not exists public.support_banned_words (
  id bigserial primary key,
  pattern text not null,
  is_regex boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists support_banned_words_active_idx on public.support_banned_words(is_active);

create or replace function public.support_normalize_arabic(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  t text;
begin
  t := coalesce(p_text, '');
  t := lower(t);
  t := regexp_replace(t, '[ً-ْـٰ]', '', 'g');
  t := translate(t, 'أإآٱ', 'اااا');
  t := translate(t, 'ى', 'ي');
  t := translate(t, 'ة', 'ه');
  t := regexp_replace(t, '[[:punct:]]+', ' ', 'g');
  t := regexp_replace(t, '(.)\1{2,}', '\1\1', 'g');
  t := regexp_replace(t, '\s+', ' ', 'g');
  return btrim(t);
end;
$$;

create or replace function public.support_normalize_arabic_compact(p_text text)
returns text
language sql
immutable
as $$
  select replace(public.support_normalize_arabic(p_text), ' ', '');
$$;

create or replace function public.support_message_contains_banned_word(p_body text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with x as (
    select
      public.support_normalize_arabic(p_body) as body,
      public.support_normalize_arabic_compact(p_body) as body_compact
  )
  select exists (
    select 1
    from public.support_banned_words w, x
    where w.is_active
      and (
        (w.is_regex and x.body ~* w.pattern)
        or
        (
          not w.is_regex
          and (
            position(public.support_normalize_arabic(w.pattern) in x.body) > 0
            or position(public.support_normalize_arabic_compact(w.pattern) in x.body_compact) > 0
          )
        )
      )
  );
$$;

create or replace function public.support_block_banned_words()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.support_message_contains_banned_word(new.body) then
    raise exception using message = 'رسالتك تحتوي على ألفاظ غير لائقة';
  end if;
  return new;
end;
$$;

drop trigger if exists support_messages_block_banned_words on public.support_messages;
create trigger support_messages_block_banned_words
before insert or update on public.support_messages
for each row
execute function public.support_block_banned_words();

alter table public.support_banned_words enable row level security;

drop policy if exists support_banned_words_select_admin on public.support_banned_words;
create policy support_banned_words_select_admin
on public.support_banned_words
for select
using (public.support_is_admin_or_master());

drop policy if exists support_banned_words_insert_admin on public.support_banned_words;
create policy support_banned_words_insert_admin
on public.support_banned_words
for insert
with check (public.support_is_admin_or_master());

drop policy if exists support_banned_words_update_admin on public.support_banned_words;
create policy support_banned_words_update_admin
on public.support_banned_words
for update
using (public.support_is_admin_or_master())
with check (public.support_is_admin_or_master());

drop policy if exists support_banned_words_delete_admin on public.support_banned_words;
create policy support_banned_words_delete_admin
on public.support_banned_words
for delete
using (public.support_is_admin_or_master());
