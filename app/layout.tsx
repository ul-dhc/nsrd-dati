import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const githubPages = process.env.GITHUB_PAGES === 'true';
const faviconUrl = `${githubPages ? '/nsrd-dati' : ''}/favicon.svg?v=2`;
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NSRD un Seque ierakstu un personu tīkla vizualizācija',
  description: 'Interaktīva NSRD un Seque ierakstu, personu un savstarpējo saikņu vizualizācija.',
  icons: {
    icon: [{ url: faviconUrl, type: 'image/svg+xml', sizes: 'any' }],
    shortcut: faviconUrl,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="lv" className="dark" style={{ colorScheme: 'dark' }}><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
