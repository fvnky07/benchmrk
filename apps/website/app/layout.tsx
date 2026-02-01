import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const clashGrotesk = localFont({
  src: [
    {
      path: '../public/fonts/ClashGrotesk-Variable.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-clash-grotesk',
  display: 'swap',
});

const nippo = localFont({
  src: [
    {
      path: '../public/fonts/Nippo-Variable.woff2',
      style: 'normal',
    },
  ],
  variable: '--font-nippo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Benchmrk',
  description: 'benchmrk agentic fitness tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${clashGrotesk.variable} ${nippo.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
