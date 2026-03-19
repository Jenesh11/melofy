import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from './firebase-admin';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  exp?: number;
}

export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseUser | null> {
  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(idToken);

    return { uid: decoded.uid, email: decoded.email, exp: decoded.exp };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}

export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: VerifiedFirebaseUser;
    }
  }
}
