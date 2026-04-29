import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Eagle Eyes',
  description:
    'Multi-domain content curation and post generation. Aggregate feeds, score relevance, and turn the best items into human-approved X and LinkedIn posts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
