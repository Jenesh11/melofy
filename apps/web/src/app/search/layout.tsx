import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search - Melofy',
  description:
    'Search for millions of tracks, artists, and albums. Find your sound on Melofy.',
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
