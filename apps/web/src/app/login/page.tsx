'use client';

import { LoginView } from '@/components/auth/LoginView';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LoginContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl || '/');
    }
  }, [user, loading, router, searchParams]);

  if (loading) return null;
  if (user) return null; // Let the redirect happen

  return <LoginView />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
