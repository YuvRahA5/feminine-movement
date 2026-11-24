-- 006: phone notifications (web push).
-- Events write to an outbox; a cron job every minute calls the "push" edge function, which delivers them.
-- The VAPID private key and the cron token live in app_secrets (no client access) and are inserted separately, not in this file.

create extension if not exists pg_net;

create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push subs" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  url text not null default './#/home',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  result text
);
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select using (user_id = auth.uid() or is_admin());
grant select on public.notifications to authenticated;

alter table public.bookings add column if not exists reminded_at timestamptz;

create or replace function public.fm_when(t timestamptz) returns text language sql immutable as $$
  select 'יום ' || (array['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'])[extract(dow from t at time zone 'Asia/Jerusalem')::int + 1]
         || ' ' || to_char(t at time zone 'Asia/Jerusalem', 'FMDD.FMMM') || ' ב־' || to_char(t at time zone 'Asia/Jerusalem', 'HH24:MI');
$$;

create or replace function public.notify(u uuid, t text, b text, link text default './#/home') returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body, url) values (u, t, b, link);
$$;

create or replace function public.notify_admins(t text, b text) returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body, url) select id, t, b, './#/admin' from profiles where is_admin;
$$;

-- Waitlist promotion and cancellations
create or replace function public.trg_booking_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare sess class_sessions; who text;
begin
  select * into sess from class_sessions where id = new.session_id;
  select display_name into who from profiles where id = new.user_id;
  if old.status = 'waitlist' and new.status = 'booked' then
    perform notify(new.user_id, 'התפנה מקום! נרשמת לשיעור 💃',
      sess.title || ', ' || fm_when(sess.starts_at) || '. ירד שיעור מהמנוי. לא יכולה להגיע? כנסי לאתר לבטל.', './#/schedule');
    perform notify_admins('נכנסה מרשימת ההמתנה', coalesce(who, 'לקוחה') || ' · ' || sess.title || ', ' || fm_when(sess.starts_at));
  elsif old.status = 'booked' and new.status = 'cancelled' and not sess.cancelled then
    perform notify_admins('ביטול הרשמה', coalesce(who, 'לקוחה') || ' ביטלה · ' || sess.title || ', ' || fm_when(sess.starts_at));
  end if;
  return new;
end $$;
drop trigger if exists booking_notify on public.bookings;
create trigger booking_notify after update of status on public.bookings for each row execute function public.trg_booking_notify();

create or replace function public.trg_session_cancel_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cancelled and not old.cancelled then
    insert into notifications(user_id, title, body, url)
    select b.user_id, 'השיעור בוטל', new.title || ', ' || fm_when(new.starts_at) || ' בוטל. השיעור חזר למנוי שלך 🤍', './#/schedule'
      from bookings b where b.session_id = new.id and b.status = 'booked';
  end if;
  return new;
end $$;
drop trigger if exists session_cancel_notify on public.class_sessions;
create trigger session_cancel_notify after update of cancelled on public.class_sessions for each row execute function public.trg_session_cancel_notify();

-- Reminder about 3 hours before class
create or replace function public.queue_reminders() returns void
language plpgsql security definer set search_path = public as $$
begin
  with due as (
    update bookings b set reminded_at = now()
      from class_sessions s
     where s.id = b.session_id and b.status = 'booked' and b.reminded_at is null and not s.cancelled
       and s.starts_at between now() and now() + interval '3 hours'
    returning b.user_id, s.title, s.starts_at)
  insert into notifications(user_id, title, body, url)
  select user_id, 'נתראה היום על הרצפה 👠', title || ' ב־' || to_char(starts_at at time zone 'Asia/Jerusalem', 'HH24:MI') || '. מרווה 11, שכונת סיגליות.', './#/home' from due;
end $$;

revoke execute on function public.notify(uuid,text,text,text), public.notify_admins(text,text), public.queue_reminders(),
  public.trg_booking_notify(), public.trg_session_cancel_notify() from public, anon, authenticated;

-- Every minute: queue reminders, then ask the edge function to deliver.
select cron.schedule('push-notifications', '* * * * *', $$
  select public.queue_reminders();
  select net.http_post(
    url := 'https://vlnssgrfwjrpladaltmr.supabase.co/functions/v1/push',
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-token', (select value from public.app_secrets where key = 'cron_token')),
    body := '{}'::jsonb)
  where exists (select 1 from public.notifications where sent_at is null);
$$);

-- 007: save a device subscription for the signed-in client (moves the device to her if it was someone else's)
create or replace function public.save_push_sub(ep text, k text, a text) returns void
language sql security definer set search_path = public as $$
  insert into push_subscriptions(user_id, endpoint, p256dh, auth) values (auth.uid(), ep, k, a)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
$$;
revoke execute on function public.save_push_sub(text,text,text) from public, anon;
grant execute on function public.save_push_sub(text,text,text) to authenticated;
