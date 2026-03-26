import { AuthProvider } from '@/lib/firebase/auth-context';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

import { ThemeProvider } from '@/components/theme-provider';
import { SocketProvider } from '@/lib/socket-context';
import { AppWrapper } from '@/components/layout/AppWrapper';
import { Toaster } from 'sonner';
import { PreMiDExposer } from '@/components/PreMiDExposer';

export const metadata: Metadata = {
  title: 'Melofy - Syncing Your Soundscape',
  description:
    'The ultimate destination for music lovers. Port your Spotify playlists, discover new sounds, and experience high-fidelity streaming in a stunning, minimalist interface.',
  keywords: [
    'music streaming',
    'spotify importer',
    'melofy',
    'high fidelity audio',
    'personalized playlists',
  ],
  authors: [{ name: 'Melofy Team' }],
  creator: 'Melofy',
  publisher: 'Melofy',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://melofy.vercel.app',
    siteName: 'Melofy',
    title: 'Melofy - Your World Of Music',
    description:
      'Experience sound like never before with Melofy. Minimalist, premium, and designed for audiophiles.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Melofy Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Melofy - Your World Of Music',
    description: 'The most premium music experience on the web.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem
            disableTransitionOnChange
          >
            <SocketProvider>
              <PreMiDExposer />
              <AppWrapper>{children}</AppWrapper>
              <Toaster richColors position='bottom-right' />
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
