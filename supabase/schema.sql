-- Feminine Movement – database schema (Supabase / Postgres)
-- Run once in the Supabase SQL editor of a new project.
-- All business rules (credits, waitlist, 8-hour cancellation) live here,
-- so they hold no matter which screen or app version calls them.

create extension if not exists pgcrypto;

-- ───────────── People ─────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,                 -- full name or nickname she chose
  phone             text,
  is_admin          boolean not null default false, -- true only for Yuval
  notifications_ok  boolean,                        -- null = not answered yet
  push_token        text,
  photo_social_ok   boolean,                        -- consent to appear on studio socials
  photo_journey_ok  boolean not null default false, -- consent to private journey videos
  health_signed_at  timestamptz,                    -- valid for 2 years
  terms_version     text,
  terms_signed_at   timestamptz,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- Signed health declarations are kept as their own records (legal trail).
create table public.health_declarations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  form_text   text not null,     -- exact wording she agreed to
  answers     jsonb not null default '{}'::jsonb,
  signed_at   timestamptz not null default now()
);

-- ───────────── Editable content (changed from the admin screen, no app update) ─────────────
create table public.content (
  key        text primary key,   -- 'about_me', 'terms', 'health_form', 'faq', 'welcome_title', ...
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.daily_messages (
  id        serial primary key,
  kind      text not null check (kind in ('משפט','משימה')),
  body      text not null,       -- may contain {name}
  active    boolean not null default true,
  sort      int not null default 0
);

create table public.packages (
  id            serial primary key,
  title         text not null,
  classes       int  not null check (classes > 0),
  price_ils     int  not null check (price_ils >= 0),
  valid_days    int  not null check (valid_days > 0),
  active        boolean not null default true,
  sort          int not null default 0
);

-- ───────────── Classes ─────────────
create table public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                -- 'עקבים · מתחילות'
  level       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  capacity    int not null default 12 check (capacity >= 0),
  cancelled   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.class_sessions (starts_at);

-- Purchased cards. Credits are counted per card so expiry works.
create table public.credit_packs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  package_id   int references public.packages(id),
  total        int not null,
  remaining    int not null check (remaining >= 0),
  expires_at   timestamptz not null,
  payment_ref  text,                         -- id from the payment provider
  purchased_at timestamptz not null default now()
);

create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.class_sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null check (status in ('booked','waitlist','cancelled','attended','no_show')),
  credit_pack uuid references public.credit_packs(id),
  wait_until_hours numeric,                  -- waitlist: stop waiting X hours before class
  joined_at   timestamptz not null default now(),
  promoted_at timestamptz,                   -- moved from waitlist into the class
  cancelled_at timestamptz,
  unique (session_id, user_id)
);
create index on public.bookings (session_id, status, joined_at);

-- ───────────── Journey videos ─────────────
create table public.videos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.class_sessions(id) on delete set null,
  storage_path text not null,                -- in the private 'journey' storage bucket
  liked       boolean not null default false,
  liked_at    timestamptz,
  created_at  timestamptz not null default now()
);

-- ───────────── Helpers ─────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.can_use_app() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.onboarded_at is not null
      and p.health_signed_at > now() - interval '2 years'
      and p.terms_signed_at is not null
      and p.notifications_ok is not null
  );
$$;

create or replace function public.booked_count(s uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from bookings where session_id = s and status = 'booked';
$$;

-- Take one credit from the card that expires first.
create or replace function public.take_credit(u uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare pack uuid;
begin
  select id into pack from credit_packs
   where user_id = u and remaining > 0 and expires_at > now()
   order by expires_at asc limit 1 for update;
  if pack is null then return null; end if;
  update credit_packs set remaining = remaining - 1 where id = pack;
  return pack;
end $$;

-- ───────────── Booking rules ─────────────
-- Book a class, or join the waitlist when it is full.
create or replace function public.book_session(s uuid, wait_hours numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare sess class_sessions; pack uuid; existing bookings;
begin
  if not can_use_app() then raise exception 'יש להשלים הצהרת בריאות ותקנון'; end if;
  select * into sess from class_sessions where id = s and not cancelled for update;
  if sess.id is null or sess.starts_at <= now() then raise exception 'השיעור לא זמין'; end if;

  select * into existing from bookings where session_id = s and user_id = auth.uid();
  if existing.id is not null and existing.status in ('booked','waitlist') then return existing.status; end if;

  if booked_count(s) < sess.capacity then
    pack := take_credit(auth.uid());
    if pack is null then raise exception 'אין שיעורים בכרטיסייה'; end if;
    insert into bookings(session_id,user_id,status,credit_pack)
      values (s, auth.uid(), 'booked', pack)
      on conflict (session_id,user_id) do update
      set status='booked', credit_pack=excluded.credit_pack, cancelled_at=null, joined_at=now();
    return 'booked';
  end if;

  if wait_hours is null then raise exception 'השיעור מלא – יש לבחור עד מתי להמתין'; end if;
  -- must have a valid credit to wait, so promotion can charge it
  if not exists (select 1 from credit_packs where user_id = auth.uid() and remaining > 0 and expires_at > now())
    then raise exception 'אין שיעורים בכרטיסייה'; end if;
  insert into bookings(session_id,user_id,status,wait_until_hours)
    values (s, auth.uid(), 'waitlist', wait_hours)
    on conflict (session_id,user_id) do update
    set status='waitlist', wait_until_hours=excluded.wait_until_hours, cancelled_at=null, joined_at=now();
  return 'waitlist';
end $$;

-- Move the next eligible waiting client into the class. Returns her user id (to notify).
create or replace function public.promote_waitlist(s uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare sess class_sessions; w bookings; pack uuid;
begin
  select * into sess from class_sessions where id = s for update;
  while booked_count(s) < sess.capacity loop
    select * into w from bookings
     where session_id = s and status = 'waitlist'
       and now() < sess.starts_at - make_interval(mins => (wait_until_hours * 60)::int)
     order by joined_at asc limit 1 for update skip locked;
    if w.id is null then return null; end if;
    pack := take_credit(w.user_id);
    if pack is null then
      update bookings set status='cancelled', cancelled_at=now() where id = w.id;  -- no credit left
      continue;
    end if;
    update bookings set status='booked', credit_pack=pack, promoted_at=now() where id = w.id;
    return w.user_id;   -- the app sends "נכנסת לשיעור!" to this user
  end loop;
  return null;
end $$;

-- Cancel. Rule: 8+ hours before → credit back. Under 8 hours → only if someone is waiting
-- to take the spot (she gets her credit back, the waiting client is promoted).
create or replace function public.cancel_booking(s uuid) returns text
language plpgsql security definer set search_path = public as $$
declare b bookings; sess class_sessions; hours_left numeric; waiting int;
begin
  select * into b from bookings where session_id = s and user_id = auth.uid() for update;
  if b.id is null then raise exception 'לא נמצאה הרשמה'; end if;
  if b.status = 'waitlist' then
    update bookings set status='cancelled', cancelled_at=now() where id = b.id;
    return 'left_waitlist';
  end if;
  if b.status <> 'booked' then raise exception 'אין מה לבטל'; end if;

  select * into sess from class_sessions where id = s;
  hours_left := extract(epoch from (sess.starts_at - now())) / 3600;
  select count(*) into waiting from bookings
   where session_id = s and status = 'waitlist'
     and now() < sess.starts_at - make_interval(mins => (wait_until_hours * 60)::int);

  if hours_left < 8 and waiting = 0 then
    raise exception 'פחות מ־8 שעות לשיעור ואין מישהי ברשימת ההמתנה – לא ניתן לבטל';
  end if;

  update bookings set status='cancelled', cancelled_at=now() where id = b.id;
  if b.credit_pack is not null then
    update credit_packs set remaining = remaining + 1 where id = b.credit_pack;
  end if;
  perform promote_waitlist(s);
  return 'cancelled';
end $$;

-- When Yuval cancels a class: everyone booked gets the credit back.
create or replace function public.admin_cancel_session(s uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update class_sessions set cancelled = true where id = s;
  update credit_packs cp set remaining = remaining + 1
    from bookings b where b.session_id = s and b.status = 'booked' and b.credit_pack = cp.id;
  update bookings set status='cancelled', cancelled_at=now()
    where session_id = s and status in ('booked','waitlist');
end $$;

-- When Yuval raises capacity, fill from the waitlist.
create or replace function public.admin_set_capacity(s uuid, cap int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update class_sessions set capacity = cap where id = s;
  perform promote_waitlist(s);
end $$;

-- Today's message for the signed-in client, rotating through the active list.
create or replace function public.message_of_day(shift int default 0) returns table(kind text, body text)
language sql stable security definer set search_path = public as $$
  with m as (select kind, body, row_number() over (order by sort, id) - 1 as rn,
                    count(*) over () as n from daily_messages where active)
  select kind, replace(body, '{name}', coalesce((select display_name from profiles where id = auth.uid()), 'יפה שלי'))
  from m where rn = ((extract(doy from now())::int + shift) % n);
$$;

-- ───────────── Row level security ─────────────
alter table public.profiles            enable row level security;
alter table public.health_declarations enable row level security;
alter table public.content             enable row level security;
alter table public.daily_messages      enable row level security;
alter table public.packages            enable row level security;
alter table public.class_sessions      enable row level security;
alter table public.credit_packs        enable row level security;
alter table public.bookings            enable row level security;
alter table public.videos              enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or is_admin());
create policy "create own profile" on public.profiles for insert with check (id = auth.uid() and is_admin = false);
create policy "edit own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = public.is_admin());
create policy "admin edits profiles" on public.profiles for update using (is_admin());

create policy "own declarations" on public.health_declarations for select using (user_id = auth.uid() or is_admin());
create policy "sign declaration" on public.health_declarations for insert with check (user_id = auth.uid());

create policy "read content" on public.content for select using (true);
create policy "admin content" on public.content for all using (is_admin()) with check (is_admin());

create policy "read messages" on public.daily_messages for select using (is_admin());
create policy "admin messages" on public.daily_messages for all using (is_admin()) with check (is_admin());

create policy "read packages" on public.packages for select using (true);
create policy "admin packages" on public.packages for all using (is_admin()) with check (is_admin());

create policy "read sessions" on public.class_sessions for select using (can_use_app() or is_admin());
create policy "admin sessions" on public.class_sessions for all using (is_admin()) with check (is_admin());

create policy "own credits" on public.credit_packs for select using (user_id = auth.uid() or is_admin());
create policy "admin credits" on public.credit_packs for all using (is_admin()) with check (is_admin());
-- (paid packs are inserted by the payment webhook with the service key, not by the app)

create policy "own bookings" on public.bookings for select using (user_id = auth.uid() or is_admin());
create policy "admin bookings" on public.bookings for all using (is_admin()) with check (is_admin());
-- clients change bookings only through book_session / cancel_booking

create policy "own videos" on public.videos for select using (user_id = auth.uid() or is_admin());
create policy "like own videos" on public.videos for update using (user_id = auth.uid());
create policy "admin videos" on public.videos for all using (is_admin()) with check (is_admin());

-- ───────────── Access for signed-in clients ─────────────
-- (the project does not expose new tables automatically, so grant explicitly;
--  row level security above still decides which rows each person sees)
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update on public.profiles, public.health_declarations to authenticated;
grant update (liked, liked_at) on public.videos to authenticated;
grant insert, update, delete on public.content, public.daily_messages, public.packages,
  public.class_sessions, public.credit_packs, public.bookings, public.videos to authenticated; -- admin only, via policies
grant usage, select on all sequences in schema public to authenticated;
-- Supabase grants every function to anon/authenticated by default; internal helpers
-- (take_credit, promote_waitlist, booked_count) must never be callable from the app.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.book_session(uuid, numeric), public.cancel_booking(uuid),
  public.message_of_day(int), public.admin_cancel_session(uuid), public.admin_set_capacity(uuid, int),
  public.is_admin(), public.can_use_app() to authenticated;

-- ───────────── Private video storage ─────────────
-- Files live at journey/<client user id>/<file>. Only that client and Yuval can read them.
insert into storage.buckets (id, name, public) values ('journey', 'journey', false)
  on conflict (id) do nothing;
create policy "journey read own" on storage.objects for select to authenticated
  using (bucket_id = 'journey' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy "journey admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'journey' and public.is_admin());
create policy "journey admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'journey' and public.is_admin());

-- ───────────── Starting data ─────────────
insert into public.packages (title, classes, price_ils, valid_days, sort) values
  ('שיעור בודד',             1,  80,  30, 1),   -- valid_days: placeholder until Yuval decides
  ('כרטיסייה · 4 שיעורים',   4, 300,  60, 2),
  ('כרטיסייה · 8 שיעורים',   8, 560,  90, 3),
  ('כרטיסייה · 12 שיעורים', 12, 780, 120, 4);
