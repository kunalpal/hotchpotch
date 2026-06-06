import { db } from '@/utils/db';
import { user } from '@/db/auth';
import { eq } from 'drizzle-orm';

/**
 * Get the profile image for a user.
 * Returns the base64 data URI or null.
 */
export async function getProfileImage(userId: number): Promise<string | null> {
  const result = await db
    .select({ profileImage: user.profileImage })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.profileImage ?? null;
}

/**
 * Update the profile image for a user.
 * Stores a base64 data URI directly in the DB.
 */
export async function updateProfileImage(
  userId: number,
  profileImage: string
): Promise<void> {
  await db
    .update(user)
    .set({
      profileImage: profileImage || null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}

/**
 * Update the user's name in the DB.
 * This updates the Better Auth user table directly.
 */
export async function updateUserName(
  userId: number,
  name: string
): Promise<void> {
  await db
    .update(user)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
}
