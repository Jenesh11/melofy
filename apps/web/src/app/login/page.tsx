'use client';

import { LoginView } from '@/components/auth/LoginView';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) return null;
  if (user) return null; // Let the redirect happen

  return <LoginView />;
}
