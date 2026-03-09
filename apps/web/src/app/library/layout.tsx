import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Library - Melofy',
  description:
    'Manage your music collection, imported Spotify playlists, and favorite tracks on Melofy.',
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
