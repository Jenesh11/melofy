import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings - Melofy',
  description:
    'Customize your music experience. Adjust themes, essences, and account preferences on Melofy.',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
