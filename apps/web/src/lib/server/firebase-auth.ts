import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebase-admin';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

export async function verifyFirebaseUserFromRequest(
  request: Request,
): Promise<VerifiedFirebaseUser | null> {
  const idToken = getBearerToken(request);
  if (!idToken) return null;

  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(idToken);

    return { uid: decoded.uid, email: decoded.email };
  } catch (error) {
    console.error('Failed to verify Firebase token:', error);
    return null;
  }
}
