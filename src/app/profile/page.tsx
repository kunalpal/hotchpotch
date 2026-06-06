import { ensureAuth } from '@/utils/auth';
import { ProfilePageClient } from '@/app/profile/components/ProfilePageClient';

export default async function ProfilePage() {
  await ensureAuth();
  return <ProfilePageClient />;
}
