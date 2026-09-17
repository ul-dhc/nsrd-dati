import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const githubPages = process.env.GITHUB_PAGES === 'true';
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NSRD un Seque ierakstu un personu tīkla vizualizācija',
  description: 'Interaktīva NSRD un Seque ierakstu, personu un savstarpējo saikņu vizualizācija.',
  icons: { icon: githubPages ? '/nsrd-dati/favicon.svg' : '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="lv"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
