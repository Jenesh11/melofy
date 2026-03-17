import type { NextFunction, Request, Response } from 'express';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

function getFirebaseApiKey(): string | null {
  return process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || null;
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseUser | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };

    const user = data.users?.[0];
    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
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
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    res.status(500).json({
      error:
        'Auth is not configured. Set FIREBASE_API_KEY (or NEXT_PUBLIC_FIREBASE_API_KEY) on the API service.',
    });
    return;
  }

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
