import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Nexus', template: '%s · Nexus' },
  description: 'The momentum-driven social network. Built for creators.',
  keywords: ['social media', 'nexus', 'creator platform', 'momentum feed'],
  authors: [{ name: 'Nexus' }],
  creator: 'Nexus',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env['NEXT_PUBLIC_APP_URL'],
    siteName: 'Nexus',
    title: 'Nexus — The momentum-driven social network',
    description: 'Built for creators. Powered by engagement velocity.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus',
    description: 'The momentum-driven social network.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
