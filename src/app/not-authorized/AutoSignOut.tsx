'use client';

import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

// Client component that signs out a user if they are currently signed in.
// Use this on pages that should log out users who hit a guard (like not-authorized)
// to avoid redirect loops.
export default function AutoSignOut() {
  const session = authClient.useSession();
  const isLoaded = !session.isPending;
  const isSignedIn = !!session.data;

  useEffect(() => {
    if (!isLoaded) return; // wait for auth to initialize
    if (isSignedIn) {
      // sign out to break potential redirect loops
      authClient.signOut();
    }
  }, [isLoaded, isSignedIn]);

  return null;
}
