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
  const apiKey =
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!idToken || !apiKey) return null;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };

    const user = payload.users?.[0];
    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
  } catch (error) {
    console.error('Failed to verify Firebase token:', error);
    return null;
  }
}
