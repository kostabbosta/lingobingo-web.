-- Applied through the Supabase SQL Editor on 2026-09-08.
-- Allow preference saves using the Android app's email-based user_id.
-- Existing read policies are preserved. No delete or anonymous write access.
begin;
create policy "Users can insert own settings"
on public.user_settings for insert to authenticated
with check ((select lower(auth.email())) = user_id);
create policy "Users can update own settings"
on public.user_settings for update to authenticated
using ((select lower(auth.email())) = user_id)
with check ((select lower(auth.email())) = user_id);
commit;
