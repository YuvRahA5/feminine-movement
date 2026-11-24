-- 004: corrections after Yuval's review of the website (Nov 2026)

-- 1. Health declaration: real yes/no answers. Any "yes" needs a doctor's certificate,
--    which Yuval approves from the admin screen. Until then the client can't book.
alter table public.health_declarations
  add column if not exists needs_doctor boolean generated always as (answers @? '$.* ? (@ == true)') stored,
  add column if not exists doctor_approved_at timestamptz;

create or replace function public.health_ok(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not d.needs_doctor or d.doctor_approved_at is not null
                   from health_declarations d where d.user_id = u order by d.signed_at desc limit 1), false);
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

create or replace function public.book_session(s uuid, wait_hours numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare sess class_sessions; pack uuid; existing bookings;
begin
  if not can_use_app() then raise exception 'יש להשלים הצהרת בריאות ותקנון'; end if;
  if not health_ok(auth.uid()) then raise exception 'צריך אישור רופא לפני ההרשמה. שלחי אותו ליובל'; end if;
  select * into sess from class_sessions where id = s and not cancelled for update;
  if sess.id is null or sess.starts_at <= now() then raise exception 'השיעור לא זמין'; end if;

  select * into existing from bookings where session_id = s and user_id = auth.uid();
  if existing.id is not null and existing.status in ('booked','waitlist') then return existing.status; end if;

  if booked_count(s) < sess.capacity then
    pack := take_credit(auth.uid());
    if pack is null then raise exception 'אין שיעורים במנוי'; end if;
    insert into bookings(session_id,user_id,status,credit_pack)
      values (s, auth.uid(), 'booked', pack)
      on conflict (session_id,user_id) do update
      set status='booked', credit_pack=excluded.credit_pack, cancelled_at=null, joined_at=now();
    return 'booked';
  end if;

  if wait_hours is null then raise exception 'השיעור מלא – יש לבחור עד מתי להמתין'; end if;
  if not exists (select 1 from credit_packs where user_id = auth.uid() and remaining > 0 and expires_at > now())
    then raise exception 'אין שיעורים במנוי'; end if;
  insert into bookings(session_id,user_id,status,wait_until_hours)
    values (s, auth.uid(), 'waitlist', wait_hours)
    on conflict (session_id,user_id) do update
    set status='waitlist', wait_until_hours=excluded.wait_until_hours, cancelled_at=null, joined_at=now();
  return 'waitlist';
end $$;

create or replace function public.admin_approve_doctor(u uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update health_declarations set doctor_approved_at = now()
   where id = (select id from health_declarations where user_id = u order by signed_at desc limit 1);
end $$;

create or replace function public.my_health_ok() returns boolean
language sql stable security definer set search_path = public as $$ select health_ok(auth.uid()); $$;

revoke execute on function public.health_ok(uuid), public.admin_approve_doctor(uuid), public.my_health_ok() from public, anon, authenticated;
grant execute on function public.admin_approve_doctor(uuid), public.my_health_ok() to authenticated;

-- 2. Clients upload their own journey videos (private: only she and Yuval see them).
create policy "journey own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'journey' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "journey own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'journey' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "add own video" on public.videos for insert with check (user_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy "delete own video" on public.videos for delete using (user_id = auth.uid());
grant insert, delete on public.videos to authenticated;

-- 3. Prices and a payment link per plan (UPAY links filled in when Yuval sends them).
alter table public.packages add column if not exists pay_url text;
update public.packages set price_ils = 240 where id = 5;
update public.packages set price_ils = 440 where id = 6;
update public.packages set price_ils = 65  where id = 7;
