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
import { ExternalIntegrations } from '@/components/ExternalIntegrations';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://melofy.jene.in'),
  title: 'Melofy - Stream High-Fidelity Music & Port Spotify Playlists',
  applicationName: 'Melofy',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Melofy',
  },
  description:
    'Import Spotify playlists instantly, sync with friends using Listen Along, and stream high-fidelity audio inside a stunning, minimalist music experience.',
  keywords: [
    'music streaming',
    'spotify importer',
    'melofy',
    'melofy music',
    'melofy app',
    'melofy music app',
    'melofy music streaming',
    'high fidelity audio',
    'personalized playlists',
    'listen along',
    'music sync',
  ],
  authors: [{ name: 'Melofy Team', url: 'https://melofy.jene.in' }],
  creator: 'Melofy',
  publisher: 'Melofy',
  icons: {
    icon: [
      { url: '/logo.png' },
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://melofy.jene.in',
    siteName: 'Melofy',
    title: 'Melofy - Stream High-Fidelity Music & Port Spotify Playlists',
    description:
      'Import Spotify playlists instantly, sync with friends using Listen Along, and stream high-fidelity audio inside a stunning, minimalist music experience.',
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
    card: 'summary',
    title: 'Melofy - Stream High-Fidelity Music & Port Spotify Playlists',
    description:
      'Import Spotify playlists instantly, sync with friends using Listen Along, and stream high-fidelity audio inside a stunning, minimalist music experience.',
    images: ['/logo.png'],
    creator: '@lazy_shrey',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
              <ExternalIntegrations />
              <AppWrapper>{children}</AppWrapper>
              <Toaster richColors position='bottom-right' />
            </SocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
