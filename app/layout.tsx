import './globals.css';
import { Providers } from './providers';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MUED LMS',
  description: 'MUED Learning Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* Google Fontsのリンクを直接追加 */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet"
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Shantell+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Flow+Circular&display=swap"
          rel="stylesheet" 
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
} 