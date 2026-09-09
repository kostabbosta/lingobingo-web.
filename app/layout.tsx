import type { Metadata } from 'next';
import './globals.css';
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, PLAY_STORE_URL } from '../lib/site';
import { ADSENSE } from '../lib/ads';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: 'LingoBingo English',
  alternates: { canonical: '/' },
  keywords: ['learn English', 'English vocabulary', 'English flashcards', 'English grammar', 'English quizzes', 'daily English practice', 'A1 to C2 vocabulary', 'English learning app', 'LingoBingo'],
  openGraph: { type: 'website', url: SITE_URL, siteName: 'LingoBingo English', title: SITE_TITLE, description: SITE_DESCRIPTION, locale: 'en_US' },
  twitter: { card: 'summary', title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  icons: { icon: { url: '/favicon.svg?v=2', type: 'image/svg+xml' }, apple: '/logo.png' },
};
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'LingoBingo English', description: SITE_DESCRIPTION, inLanguage: 'en' },
    { '@type': 'MobileApplication', name: 'LingoBingo — English Words', operatingSystem: 'Android', applicationCategory: 'EducationalApplication', url: PLAY_STORE_URL, downloadUrl: PLAY_STORE_URL, sameAs: PLAY_STORE_URL, description: 'Practice English vocabulary with flashcards, quizzes and daily learning.', publisher: { '@type': 'Organization', name: 'Online Pay LTD' } },
  ],
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.publisherId}`} crossOrigin="anonymous" />
      </head>
      <body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />{children}</body>
    </html>
  );
}
