# Bilingual vocabulary implementation — 8 September 2026

## Step 1: Shared content contract

`GET /api/vocabulary?word=apple&lang=hi` returns an English word, target-language translation, paired English/translated examples, and a review status. The website supports its existing 18 translation languages. Hindi is the initial panel default. Android offers Hindi and the learner's configured translation language.

Both clients first read `public.vocabulary_localizations` in the existing Supabase project. A row is keyed by normalized English word and language; examples are paired objects rather than unrelated sentence lists. Status is `draft`, `reviewed`, `machine`, or `missing`. No account information belongs in this table.

The schema and eight Hindi sample rows are prepared in `supabase/migrations/20260908_*.sql`. **They have not been applied:** automatic approval review rejected the production grant of SELECT to anon/authenticated. Obtain the user's specific approval for public read access to this educational-content table before executing the prepared SQL. Public clients receive no insert/update/delete privileges.

## Step 2: Web experience

Study cards show English and Hindi side by side at desktop widths. At 640px and below, each translation appears immediately below its English source. The language selector and “Show Hindi translations” checkbox persist locally. Quiz and writing answers are not revealed by this panel.

Failed requests stop loading and offer Retry. Missing translations display an explicit unavailable message. If an English example exists without a translation, its English text remains visible. No invented example replaces an unavailable dictionary example.

## Step 3: Android implementation

The Android project includes `ParallelVocabularyService.kt`, `ParallelVocabularyPanel.kt`, and calls in Learn Words and Repeat Words. The panel stacks text below 600dp and uses columns on larger cards. Its visibility switch persists in SharedPreferences. The same Hindi JSON and static Noto Sans Devanagari font are bundled in both projects; SHA-256 comparisons confirmed that both copies match.

## Step 4: Content and accuracy

Eight Hindi sample words and paired examples are bundled: apple, water, book, learn, school, friend, beautiful, and read. They are drafts awaiting language review, not a reviewed translation of the entire vocabulary catalog. Other words use machine translation and available English dictionary examples, explicitly labeled as machine-generated. A Devanagari script check rejects English-only fallback text masquerading as Hindi; this is structural validation, not semantic accuracy verification.

Canonical shared rows provide consistent translations across both clients. Dynamic machine fallback can change over time and is not persisted; do not promise identical fallback output across devices. Curated expansion should write reviewed word/example pairs into the shared table. Ambiguous words need sense-aware review; the current key has one translation record per English spelling and language.

## Step 5: Verification and remaining work

- Production web build passed; TypeScript check passed after follow-up fixes.
- 17 existing account/progress/content tests and 6 bilingual tests passed.
- Browser checks confirmed paired apple/सेब examples, the hide/show switch, columns at 1280px, and stacked translations at 390px without horizontal overflow. Temporary viewport overrides were reset.
- Android compilation was attempted with JDK 17, including execution outside the sandbox. Gradle fails before compilation with `Unable to establish loopback connection`.
- No connected Android device or configured emulator was available. Android visual and runtime validation remain pending.
- Production migration/seed execution and native Hindi accuracy review remain pending. Do not mark the full request complete until these checks and content review are resolved.

Run web checks from `web`: `npx tsc --noEmit`, `node scripts/check-learning.mjs`, and `node scripts/check-vocabulary.mjs`.
