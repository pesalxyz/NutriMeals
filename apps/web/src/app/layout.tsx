import '../styles/globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'NutriMeals',
  description: 'NutriMeals - Scan. Eat. Know. Pelacakan nutrisi makanan berbasis AI.',
  applicationName: 'NutriMeals',
  icons: {
    icon: [
      { url: '/branding/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/branding/icons/favicon-16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [{ url: '/branding/icons/nutrimeals-icon-180.png', sizes: '180x180', type: 'image/png' }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
