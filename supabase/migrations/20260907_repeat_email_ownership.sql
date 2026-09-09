-- Applied through the Supabase dashboard on 2026-09-07.
-- Preserve RLS; allow only the authenticated owner.
begin;
create policy "Users can manage own repeat words"
on public.user_repeat_words
for all
to authenticated
using ((select lower(auth.email())) = user_id)
with check ((select lower(auth.email())) = user_id);
commit;
