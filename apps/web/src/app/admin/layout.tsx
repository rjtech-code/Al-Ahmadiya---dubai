import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-cormorant', display: 'swap' });

export const metadata: Metadata = { title: 'Administration | Al Ahmadiya', robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh text-ink antialiased">{children}</body>
    </html>
  );
}
