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
    'melofy music streaming app',
    'high fidelity audio',
    'personalized playlists',
  ],
  authors: [{ name: 'Melofy Team' }],
  creator: 'Melofy',
  publisher: 'Melofy',
  icons: {
    icon: 'https://i.ibb.co/HpfVk6KN/melofy.png',
    apple: 'https://i.ibb.co/HpfVk6KN/melofy.png',
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
        url: 'https://i.ibb.co/HpfVk6KN/melofy.png',
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
    images: ['https://i.ibb.co/HpfVk6KN/melofy.png'],
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
