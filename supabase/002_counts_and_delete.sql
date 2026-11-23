-- How full each class is, without revealing who booked.
create or replace function public.session_counts(ids uuid[])
returns table(session_id uuid, booked int, waiting int)
language sql stable security definer set search_path = public as $$
  select s.id,
         count(b.*) filter (where b.status = 'booked')::int,
         count(b.*) filter (where b.status = 'waitlist')::int
  from class_sessions s
  left join bookings b on b.session_id = s.id
  where s.id = any(ids) and (can_use_app() or is_admin())
  group by s.id;
$$;

-- A client deletes her own account (required by Apple). Her profile, bookings,
-- declarations and video records go with it through the cascades.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if is_admin() then raise exception 'חשבון הניהול לא נמחק מהאפליקציה'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.session_counts(uuid[]), public.delete_my_account() from public, anon;
grant execute on function public.session_counts(uuid[]), public.delete_my_account() to authenticated;
