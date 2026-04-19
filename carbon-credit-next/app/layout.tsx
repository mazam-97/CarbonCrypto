import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { DM_Sans, Fraunces } from 'next/font/google';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

export const metadata: Metadata = {
  title: 'Carbon rails — verifiable batch infrastructure',
  description:
    'Mint, enrich, and verify carbon credit batches on Solana. Structured issuer and verifier flows with transparent registry lookup.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body>
        <Providers>
          <div className="app-root">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
