import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Ensures the user is authenticated via Better Auth and is allowlisted.
 * Throws "Unauthorized" if no session exists.
 * Throws "Forbidden: User is not allowlisted" if user is not allowlisted.
 * Returns the Better Auth session user object.
 */
export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  if (!session.user.allowlisted) {
    throw new Error('Forbidden: User is not allowlisted');
  }

  // Better Auth returns id as string, but our DB uses serial integers.
  // Convert once here so every downstream consumer gets a numeric id.
  return { ...session.user, id: Number(session.user.id) };
}

/**
 * Server-side auth helper for Server Components.
 * Returns { userId, user } when allowed; otherwise redirects to sign-in or not-authorized.
 */
export async function ensureAuth() {
  try {
    const user = await getAuthenticatedUser();
    return { userId: user.id, user };
  } catch (err) {
    const error = err as Error;
    if (error.message === 'Unauthorized') {
      redirect('/sign-in');
    }
    redirect('/not-authorized');
  }
}

/**
 * API-friendly auth helper for API Route handlers.
 * Returns a NextResponse JSON error (401/403) instead of redirecting.
 * On success returns { userId, user }.
 */
export async function ensureAuthApi() {
  try {
    const user = await getAuthenticatedUser();
    return { userId: user.id, user };
  } catch (err) {
    const error = err as Error;
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
