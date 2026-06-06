'use client';

import { createQueryHook } from '@/lib/queries/query-factory';
import { createMutationHook } from '@/lib/queries/mutation-factory';
import { profileKeys } from '@/lib/queries/keys';
import { unwrapActionResult } from '@/lib/actions/types';
import {
  getProfileImageAction,
  updateProfileAction,
  updateProfileImageAction,
} from '@/app/profile/actions';

export const useProfileImage = createQueryHook({
  queryKey: () => profileKeys.detail(0),
  queryFn: async () => unwrapActionResult(await getProfileImageAction({})),
});

export const useUpdateProfile = createMutationHook({
  mutationFn: updateProfileAction,
  invalidateKeys: [profileKeys.all],
  successMessage: 'Profile updated',
  errorMessage: 'Failed to update profile',
});

export const useUpdateProfileImage = createMutationHook({
  mutationFn: updateProfileImageAction,
  invalidateKeys: [profileKeys.all],
  successMessage: 'Profile picture updated',
  errorMessage: 'Failed to update profile picture',
});
