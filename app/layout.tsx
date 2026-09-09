import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'LingoBingo — Learn English',
  description:
    'Learn vocabulary, practice English, and continue your LingoBingo progress across devices.',
  icons: { icon: '/logo.png' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
