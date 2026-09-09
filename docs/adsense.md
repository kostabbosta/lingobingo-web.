# Google AdSense banner

Every menu view carries four manual, in-page display ads: a horizontal
leaderboard under the top bar, a horizontal banner below the content, and
160x600 vertical rails left and right of the classroom. The rails only mount at
viewports of 1400px and wider, so narrow screens show the two horizontal units
alone.

Ads do not mount on the sign-in screen, on loading and error screens, or while a
word detail is open. Everything else — dashboard, vocabulary lists, settings,
progress, and the active practice, quiz, reading and puzzle screens — shows all
four. No timers refresh ads. The script loads once per page, and blocked ads do
not interrupt learning. Nothing loads while unconfigured.

Each placement is independent. A slot ID left empty in `lib/ads.ts` reserves its
space with a labelled placeholder instead of an ad unit, so the layout is
visible before the account is live; filling the ID in swaps the placeholder for
the real unit with no other change.

## Activate

1. Add and verify lingobingoenglish.com in the website owner's AdSense account.
2. Create one Display ad unit per placement in use — horizontal units for `top`
   and `bottom`, vertical units for `left` and `right`. Copy the account's
   `ca-pub-…` publisher ID and each unit's numeric `data-ad-slot` into the
   matching key of `ADSENSE.slots` in `lib/ads.ts`.
3. Publish the appropriate consent message in AdSense Privacy & messaging
   (or configure a Google-certified CMP). This code does not supply a CMP.
   Update the site's privacy disclosures for the actual advertising setup.
4. Copy the account-provided ads.txt entry into `public/ads.txt`. Do not use an
   Android AdMob unit ID or invent a publisher ID.
5. After account/site approval and consent setup, set `enabled: true`, build and
   deploy. Keep Auto ads disabled in AdSense: the manual placements already
   cover every screen, and Auto ads would add overlays on top of them.
6. Verify the deployed banner and consent message with the real account. Do not
   click your own ads. Google controls availability and the displayed creatives;
   a banner placement does not guarantee still-image-only advertisements.

Official guidance:
- https://support.google.com/adsense/answer/9183460
- https://support.google.com/adsense/answer/13554116

Live ad delivery is not verified until real IDs and the account configuration
are available. The initial configuration intentionally keeps ads disabled.
