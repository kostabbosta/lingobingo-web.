# LingoBingo English web

Web classroom based on the Android project `EWEnglishWords-New`.

## Run locally

From `web`, run `npm ci`, then `npm run dev`. The preview uses port 3000. The server needs outbound HTTPS access to the existing Supabase project and translation service.

## Validation

- `node --test scripts/check-learning.mjs scripts/check-google-auth.mjs`
- `npx tsc --noEmit`
- `npm run build`

The tests use synthetic accounts and mocked backend responses. They do not modify production accounts. A real sign-in and cross-device round trip remain necessary to verify deployed account policies.

## Shared Android accounts

The server uses the existing Supabase Auth project. Only its public anon key is configured in source; no service-role key or Google client secret belongs in this repository. Access and refresh tokens are held in HttpOnly, SameSite cookies. Account ownership comes from the verified Supabase user, never a submitted email or ID.

Vocabulary progress uses English text as its cross-device identity. Cloud reads paginate fully and writes use compare-and-set with collision-safe numeric IDs. Android's mastery threshold and spaced-repetition intervals are preserved. Repeat lists and learning preferences use the existing Android tables. Access policies must permit authenticated users to manage their own records.

The dashboard caches the mastered-word count per account in localStorage. A lightweight session check selects the account's cached count before full progress finishes loading in the background. Saved reviews update the count and cache; signed-out users never see a cached count. Focus refreshes are limited to once per minute after a successful sync. The first visit still requires one full sync to populate the cache.

## Google sign-in setup (enabled)

The website's Google sign-in button, PKCE initiation, callback exchange, and error states are implemented. Google was enabled in the existing Supabase project on September 7, 2026, and all three callback URLs below were saved. A real Google callback and subsequent account synchronization returned successfully on the local server. A cross-device review round trip still needs verification.

1. Google Cloud project `english-learner-487711` now has the Web application client `LingoBingo Web — Supabase`, created September 7, 2026. Client ID: `842806933262-4e4mqhdd1ffib4lp43i4un8ph5qntp81.apps.googleusercontent.com`. Its secret is not stored in this repository.
2. Set its authorized redirect URI to `https://ddtliujldroasbmzuqcl.supabase.co/auth/v1/callback`.
3. In Supabase project `ddtliujldroasbmzuqcl`, Google is enabled under Authentication → Sign In / Providers. The Google client ID and secret are stored there, not in website source.
4. Add these exact redirect URLs under Authentication → URL Configuration, preserving existing Android URLs:
   - `http://localhost:3000/api/auth/callback`
   - `http://127.0.0.1:3000/api/auth/callback`
   - `https://lingobingo-english.k-lobzhanidze.chatgpt.site/api/auth/callback`
5. Sign in with the same Google email used on Android and verify the progress round trip. The flow requests identity scopes only: email and profile.

Any future custom domain also needs to be allowed in `lib/oauth.ts`, the API origin check, and Supabase redirect settings.

## Learning content

`public/data` contains 17,078 unique vocabulary entries, 30 grammar lessons, 150 placement questions, 14 reading articles, 8 word-ladder puzzles, 4 exam packs, and the app's sentence and slang collections. Import again with `node scripts/import-android.mjs <Android project path>`. The importer reads public teaching content only, not user databases or progress backups.

Implemented web flows include vocabulary search, study levels, flashcards, repeat words, quizzes, spelling, word scrambles, Daily Dose, grammar exercises, reading comprehension, sentences, slang, crosswords, exam packs, and progress summaries. Android billing, advertisements, car-mode autoplay, social leaderboard, and native notifications have not been ported. Placement results and content-exercise answers are session-local; word reviews are saved to the shared account. New account confirmation and email recovery use the existing Supabase email configuration.

The optional WebMCP `start_learning_mode` tool navigates the same UI without modifying saved progress. Unsupported browsers continue normally.


## September 9 updates

Logout clears all browser `lingobingo:` caches, progress, selections, and preferences while preserving cloud account progress. A signed-out HttpOnly cookie blocks late session-refresh responses from restoring authentication; only a successful explicit email or Google sign-in clears it. Expired sessions can also log out.

The daily toolbar counts distinct words last practiced today and words first created today using the browser's local calendar date. Due reviews include overdue words. These are word counts, not daily review-event totals (the shared progress table stores lifetime totals). Module accents and 13% tinted cards follow Android DashboardStatsScreens.kt.

The app accepts `https://lingobingoenglish.com` and `https://www.lingobingoenglish.com` for OAuth. Before custom-domain Google sign-in, add each used domain's `/api/auth/callback` URL to the existing Supabase redirect allowlist. DNS and TLS activation must also complete.
