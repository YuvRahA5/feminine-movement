-- Monthly subscriptions instead of class cards.
-- Each month of a subscription becomes a credit pack that expires at the end of that month,
-- so every booking / waitlist / 8-hour rule keeps working unchanged.

alter table public.packages add column if not exists kind text not null default 'card'
  check (kind in ('monthly', 'single', 'card'));

update public.packages set active = false where kind = 'card';
insert into public.packages (title, classes, price_ils, valid_days, kind, sort) values
  ('מנוי פעם בשבוע',     4, 300, 30, 'monthly', 1),
  ('מנוי פעמיים בשבוע',  8, 560, 30, 'monthly', 2),
  ('שיעור בודד',         1,  80, 30, 'single',  3);

create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  package_id    int  not null references public.packages(id),
  status        text not null default 'active' check (status in ('active', 'cancelled')),
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  cancel_requested_at timestamptz,
  payment_ref   text,
  created_at    timestamptz not null default now()
);
create unique index subscriptions_one_active on public.subscriptions (user_id) where status = 'active';

-- Load one month's classes for a subscription period.
create or replace function public.sub_new_period_pack(sub public.subscriptions) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select classes into n from packages where id = sub.package_id;
  insert into credit_packs (user_id, package_id, total, remaining, expires_at, payment_ref, purchased_at)
  values (sub.user_id, sub.package_id, n, n, sub.period_end, 'subscription:' || sub.id, sub.period_start);
end $$;

-- Yuval starts (or switches) a client's subscription after the standing order is set up in UPAY.
create or replace function public.admin_start_subscription(u uuid, pkg int) returns uuid
language plpgsql security definer set search_path = public as $$
declare s subscriptions;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if not exists (select 1 from packages where id = pkg and kind = 'monthly') then raise exception 'זה לא מנוי חודשי'; end if;
  update subscriptions set status = 'cancelled', cancel_requested_at = now() where user_id = u and status = 'active';
  insert into subscriptions (user_id, package_id, period_start, period_end)
    values (u, pkg, now(), now() + interval '1 month') returning * into s;
  perform sub_new_period_pack(s);
  return s.id;
end $$;

create or replace function public.admin_cancel_subscription(sub uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update subscriptions set status = 'cancelled', cancel_requested_at = now() where id = sub and status = 'active';
end $$;

-- The client cancels her own subscription. No renewals after this; the classes
-- she already paid for stay usable until the end of the current month.
create or replace function public.cancel_my_subscription() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare s subscriptions;
begin
  update subscriptions set status = 'cancelled', cancel_requested_at = now()
   where user_id = auth.uid() and status = 'active' returning * into s;
  if s.id is null then raise exception 'אין מנוי פעיל'; end if;
  return s.period_end;
end $$;

-- Runs every day: rolls each active subscription into its next month and loads that month's classes.
create or replace function public.renew_subscriptions() returns int
language plpgsql security definer set search_path = public as $$
declare s subscriptions; n int := 0;
begin
  for s in select * from subscriptions where status = 'active' and period_end <= now() for update loop
    while s.period_end <= now() loop
      s.period_start := s.period_end;
      s.period_end := s.period_end + interval '1 month';
      update subscriptions set period_start = s.period_start, period_end = s.period_end where id = s.id;
      perform sub_new_period_pack(s);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;

alter table public.subscriptions enable row level security;
create policy "own subscription" on public.subscriptions for select using (user_id = auth.uid() or is_admin());
create policy "admin subscriptions" on public.subscriptions for all using (is_admin()) with check (is_admin());
grant select, insert, update on public.subscriptions to authenticated;

revoke execute on function public.sub_new_period_pack(public.subscriptions), public.renew_subscriptions(),
  public.admin_start_subscription(uuid, int), public.admin_cancel_subscription(uuid), public.cancel_my_subscription()
  from public, anon, authenticated;
grant execute on function public.admin_start_subscription(uuid, int), public.admin_cancel_subscription(uuid),
  public.cancel_my_subscription() to authenticated;
