import type { Metadata } from 'next';
import { SITE_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy · LingoBingo English',
  description: 'How LingoBingo English handles your account, learning progress, cookies and advertising.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
  metadataBase: new URL(SITE_URL),
};

export default function Privacy() {
  return (
    <main className="legal-page">
      <a className="brand legal-brand" href="/">
        <img src="/brand-logo.svg" alt="" width={56} height={56} />
        <span>Lingo<b>Bingo</b><small>ENGLISH</small></span>
      </a>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated 10 September 2026</p>

      <p>
        LingoBingo English is an English learning website operated by Online Pay LTD. This page explains what
        information the site handles, why, and the choices available to you.
      </p>

      <h2>Information collected</h2>
      <p>
        You can browse vocabulary, grammar, reading and practice exercises without an account. If you choose to
        sign in — with an email address and password, or with Google — the site stores the email address and
        display name held by your LingoBingo account, together with your learning progress: which English words
        you have practised, a proficiency score for each, how many times you have reviewed them, and when each
        word is next due for review. This is the same account used by the LingoBingo Android app, so progress is
        shared between them.
      </p>
      <p>
        The site does not collect payment details, postal addresses, or contact lists, and it does not ask for
        personal information beyond what is described above.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        Signing in sets HttpOnly cookies that keep you authenticated; signing out clears them. Your browser also
        stores learning preferences and a cached count of mastered words locally so pages load without waiting
        for a full sync. That local data stays in your browser and is removed when you sign out or clear site
        data. Advertising cookies are described below.
      </p>

      <h2>Advertising</h2>
      <p>
        This site shows advertisements supplied by Google AdSense. Google and its partners may use cookies or
        similar technologies to serve and measure ads, including ads based on your prior visits to this or other
        websites. Where required — in the European Economic Area, the United Kingdom and Switzerland — a consent
        message asks for your permission before personalised advertising cookies are used, and you may decline or
        change your choice at any time. Declining does not prevent you from using the site; you may still see
        non-personalised advertising.
      </p>
      <p>
        You can review and adjust Google&rsquo;s use of advertising data at{' '}
        <a href="https://myadcenter.google.com/">myadcenter.google.com</a>, and opt out of personalised
        advertising by third-party vendors at{' '}
        <a href="https://www.aboutads.info/choices/">aboutads.info/choices</a>.
      </p>

      <h2>Services used</h2>
      <p>
        Accounts and learning progress are stored with Supabase. Google Sign-In is offered as an optional way to
        authenticate, and requests only your email address and basic profile. Where a translation is not already
        bundled with the site, the word or sentence being translated is sent to a machine translation provider to
        produce one; this text is vocabulary content, not personal information. Pages are served through
        Cloudflare.
      </p>

      <h2>Retention and your choices</h2>
      <p>
        Account information and learning progress are kept while your account exists, so that your progress is
        available across devices. You can sign out at any time, which clears the data held in your browser. To
        request deletion of your account and its stored progress, contact us at the address below.
      </p>

      <h2>Children</h2>
      <p>
        The site is intended for a general audience learning English and is not directed at children under 13.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the revised version will be posted on this page with an updated date.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy, or requests concerning your data, can be sent to{' '}
        <a href="mailto:k.lobzhanidze@gmail.com">k.lobzhanidze@gmail.com</a>.
      </p>

      <p className="legal-back"><a href="/">← Back to LingoBingo English</a></p>
    </main>
  );
}
