'use client';

import { getAuth, type User } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

export async function getFirebaseAuthHeaders(
  user?: User | null,
): Promise<Record<string, string>> {
  const currentUser = user ?? getAuth(app).currentUser;
  if (!currentUser) return {};

  const token = await currentUser.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
