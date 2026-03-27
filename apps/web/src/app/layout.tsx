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
  metadataBase: new URL('https://melofy.jene.in'),
  title: 'Melofy | Elevate Your Sound',
  description:
    'The ultimate destination for music lovers. Port your Spotify playlists, discover new sounds, and experience high-fidelity streaming in a stunning, minimalist interface.',
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
