-- Android and the website store the verified lowercased email in user_id.
-- The existing UUID ownership condition prevents saving these records.
-- Keep RLS enabled and retain the authenticated-only role restriction.
begin;
alter policy "Users can manage own progress"
on public.user_progress
to authenticated
using ((select lower(auth.email())) = user_id)
with check ((select lower(auth.email())) = user_id);
commit;
