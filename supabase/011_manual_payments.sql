-- 011: pay by Bit / PayBox. The client taps "שילמתי", Yuval approves in admin, and the classes load.
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  package_id int not null references public.packages(id),
  method text not null check (method in ('bit','paybox')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.payment_requests enable row level security;
create policy "own payment requests" on public.payment_requests for select using (user_id = auth.uid() or is_admin());
grant select on public.payment_requests to authenticated;
grant select, insert, update, delete on public.payment_requests to service_role;

create or replace function public.request_payment(pkg int, m text) returns void
language plpgsql security definer set search_path = public as $$
declare p packages; who text;
begin
  if not can_use_app() then raise exception 'יש להשלים הרשמה'; end if;
  select * into p from packages where id = pkg and active;
  if p.id is null then raise exception 'המסלול לא נמצא'; end if;
  if exists (select 1 from payment_requests where user_id = auth.uid() and status = 'pending') then
    raise exception 'כבר שלחת אישור תשלום. יובל תאשר בקרוב 🤍'; end if;
  insert into payment_requests(user_id, package_id, method) values (auth.uid(), pkg, m);
  select display_name into who from profiles where id = auth.uid();
  perform notify_admins('תשלום לאישור 💸', coalesce(who, 'לקוחה') || ' שילמה ב' || case m when 'bit' then 'ביט' else 'פייבוקס' end || ' · ' || p.title || ' · ₪' || p.price_ils);
end $$;

create or replace function public.admin_decide_payment(r uuid, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
declare q payment_requests; p packages;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select * into q from payment_requests where id = r and status = 'pending' for update;
  if q.id is null then raise exception 'הבקשה כבר טופלה'; end if;
  select * into p from packages where id = q.package_id;
  if ok then
    insert into credit_packs(user_id, package_id, total, remaining, expires_at, payment_ref)
      values (q.user_id, p.id, p.classes, p.classes, now() + make_interval(days => p.valid_days), q.method);
    update payment_requests set status = 'approved', decided_at = now() where id = r;
    perform notify(q.user_id, 'התשלום אושר 💋', p.title || ' נטען. אפשר להירשם לשיעורים!', './#/schedule');
  else
    update payment_requests set status = 'rejected', decided_at = now() where id = r;
    perform notify(q.user_id, 'לא מצאנו את התשלום', 'יובל לא מצאה את ההעברה. כתבי לה בוואטסאפ ונסדר 🤍', './#/plans');
  end if;
end $$;

revoke execute on function public.request_payment(int,text), public.admin_decide_payment(uuid,boolean) from public, anon;
grant execute on function public.request_payment(int,text), public.admin_decide_payment(uuid,boolean) to authenticated;
