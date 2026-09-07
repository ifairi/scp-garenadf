-- SCP Alliance database and Storage security for Supabase.
-- Safe to rerun in the Supabase SQL Editor before running seed.sql.

begin;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80)
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  role text not null,
  role_groups text[] not null default array['other']::text[],
  roster_type text not null default 'alliance',
  clan_origin text not null default '',
  commitment_scope text not null default '',
  clearance text not null,
  alias text not null,
  unique_text text not null,
  track jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  stats jsonb not null default '[]'::jsonb,
  photo_path text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_code_format
    check (code ~ '^SCP-[0-9]{3,6}$'),
  constraint members_name_length
    check (char_length(btrim(name)) between 1 and 120),
  constraint members_role_length
    check (char_length(btrim(role)) between 1 and 80),
  constraint members_role_groups_not_empty
    check (cardinality(role_groups) >= 1),
  constraint members_role_groups_allowed
    check (
      role_groups <@ array[
        'vehicle', 'engineer', 'recon', 'assault',
        'support', 'command', 'other'
      ]::text[]
    ),
  constraint members_roster_type_allowed
    check (roster_type in ('main', 'alliance')),
  constraint members_clearance_length
    check (char_length(btrim(clearance)) between 1 and 80),
  constraint members_alias_length
    check (char_length(btrim(alias)) between 1 and 120),
  constraint members_unique_text_length
    check (char_length(btrim(unique_text)) between 1 and 2000),
  constraint members_track_is_array
    check (jsonb_typeof(track) = 'array'),
  constraint members_strengths_is_array
    check (jsonb_typeof(strengths) = 'array'),
  constraint members_stats_is_array
    check (jsonb_typeof(stats) = 'array'),
  constraint members_photo_path_format
    check (
      photo_path is null
      or (
        char_length(photo_path) between 10 and 500
        and photo_path like 'members/%'
        and photo_path not like '%..%'
      )
    ),
  constraint members_sort_order_nonnegative
    check (sort_order >= 0)
);

-- Keep this file safe to rerun on projects created before roster_type existed.
alter table public.members
  add column if not exists roster_type text not null default 'alliance',
  add column if not exists clan_origin text not null default '',
  add column if not exists commitment_scope text not null default '';

alter table public.members
  drop constraint if exists members_roster_type_allowed,
  drop constraint if exists members_main_commitment_required,
  drop constraint if exists members_affiliation_length;

-- Legacy affiliation must never imply confirmed competitive selection.
update public.members set roster_type = 'alliance' where roster_type = 'pure';

alter table public.members
  add constraint members_roster_type_allowed
  check (roster_type in ('main', 'alliance')),
  add constraint members_main_commitment_required
  check (roster_type <> 'main' or commitment_scope ~ '[^[:space:]]'),
  add constraint members_affiliation_length
  check (char_length(clan_origin) <= 120 and char_length(commitment_scope) <= 240);

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_kind text not null,
  operation_type text not null,
  title text not null,
  opponent text,
  status text not null default 'scheduled',
  weekday smallint,
  event_date date,
  start_time time without time zone not null,
  end_time time without time zone,
  end_open boolean not null default false,
  details text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_entries_kind_allowed
    check (schedule_kind in ('weekly', 'event')),
  constraint schedule_entries_operation_type_allowed
    check (operation_type in ('training', 'scrim', 'tournament', 'briefing', 'meeting', 'other')),
  constraint schedule_entries_status_allowed
    check (status in ('scheduled', 'seeking_opponent', 'confirmed', 'completed', 'cancelled')),
  constraint schedule_entries_title_length
    check (char_length(btrim(title)) between 1 and 160),
  constraint schedule_entries_opponent_length
    check (opponent is null or char_length(btrim(opponent)) between 1 and 120),
  constraint schedule_entries_weekday_range
    check (weekday is null or weekday between 0 and 6),
  constraint schedule_entries_kind_fields
    check (
      (schedule_kind = 'weekly' and weekday is not null and event_date is null)
      or
      (schedule_kind = 'event' and weekday is null and event_date is not null)
    ),
  constraint schedule_entries_end_mode
    check (
      (end_open and end_time is null)
      or
      (not end_open and end_time is not null)
    ),
  constraint schedule_entries_distinct_end
    check (end_time is null or end_time <> start_time),
  constraint schedule_entries_details_length
    check (char_length(details) <= 2000),
  constraint schedule_entries_notes_length
    check (char_length(notes) <= 2000),
  constraint schedule_entries_sort_order_nonnegative
    check (sort_order >= 0)
);

create index if not exists members_public_sort_idx
  on public.members (sort_order, code)
  where published;

create index if not exists members_role_groups_idx
  on public.members using gin (role_groups);

create index if not exists members_name_lower_idx
  on public.members (lower(name));

create index if not exists schedule_entries_public_sort_idx
  on public.schedule_entries (sort_order, event_date, weekday, start_time)
  where published;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists schedule_entries_set_updated_at on public.schedule_entries;
create trigger schedule_entries_set_updated_at
before update on public.schedule_entries
for each row execute function public.set_updated_at();

create or replace function public.is_scp_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_scp_admin() from public, anon;
grant execute on function public.is_scp_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.members enable row level security;
alter table public.schedule_entries enable row level security;

drop policy if exists "SCP admins can view admin list" on public.admin_users;
create policy "SCP admins can view admin list"
on public.admin_users
for select
to authenticated
using (public.is_scp_admin());

drop policy if exists "Published members are public" on public.members;
create policy "Published members are public"
on public.members
for select
to anon, authenticated
using (published);

drop policy if exists "SCP admins can view all members" on public.members;
create policy "SCP admins can view all members"
on public.members
for select
to authenticated
using (public.is_scp_admin());

drop policy if exists "SCP admins can create members" on public.members;
create policy "SCP admins can create members"
on public.members
for insert
to authenticated
with check (public.is_scp_admin());

drop policy if exists "SCP admins can update members" on public.members;
create policy "SCP admins can update members"
on public.members
for update
to authenticated
using (public.is_scp_admin())
with check (public.is_scp_admin());

drop policy if exists "SCP admins can delete members" on public.members;
create policy "SCP admins can delete members"
on public.members
for delete
to authenticated
using (public.is_scp_admin());

drop policy if exists "Published schedule entries are public" on public.schedule_entries;
create policy "Published schedule entries are public"
on public.schedule_entries
for select
to anon, authenticated
using (published);

drop policy if exists "SCP admins can view all schedule entries" on public.schedule_entries;
create policy "SCP admins can view all schedule entries"
on public.schedule_entries
for select
to authenticated
using (public.is_scp_admin());

drop policy if exists "SCP admins can create schedule entries" on public.schedule_entries;
create policy "SCP admins can create schedule entries"
on public.schedule_entries
for insert
to authenticated
with check (public.is_scp_admin());

drop policy if exists "SCP admins can update schedule entries" on public.schedule_entries;
create policy "SCP admins can update schedule entries"
on public.schedule_entries
for update
to authenticated
using (public.is_scp_admin())
with check (public.is_scp_admin());

drop policy if exists "SCP admins can delete schedule entries" on public.schedule_entries;
create policy "SCP admins can delete schedule entries"
on public.schedule_entries
for delete
to authenticated
using (public.is_scp_admin());

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.members from anon, authenticated;
revoke all on table public.schedule_entries from anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select on table public.members to anon, authenticated;
grant insert, update, delete on table public.members to authenticated;
grant select on table public.schedule_entries to anon, authenticated;
grant insert, update, delete on table public.schedule_entries to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-photos',
  'member-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "SCP admins can list member photos" on storage.objects;
create policy "SCP admins can list member photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and public.is_scp_admin()
);

drop policy if exists "SCP admins can upload member photos" on storage.objects;
create policy "SCP admins can upload member photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = 'members'
  and public.is_scp_admin()
);

drop policy if exists "SCP admins can update member photos" on storage.objects;
create policy "SCP admins can update member photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = 'members'
  and public.is_scp_admin()
)
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = 'members'
  and public.is_scp_admin()
);

drop policy if exists "SCP admins can delete member photos" on storage.objects;
create policy "SCP admins can delete member photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = 'members'
  and public.is_scp_admin()
);

comment on table public.admin_users is
  'Allowlist of Supabase Auth users permitted to manage SCP content.';
comment on table public.members is
  'Public and draft SCP operative dossiers managed from the admin panel.';
comment on column public.members.photo_path is
  'Object key inside the public member-photos bucket, for example members/<member-id>/portrait.webp.';
comment on table public.schedule_entries is
  'Recurring weekly operations and one-time SCP events in Asia/Jakarta time.';
comment on column public.schedule_entries.weekday is
  'Day of week for weekly entries: 0 is Sunday and 6 is Saturday.';

commit;
