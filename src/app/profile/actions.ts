'use server';

import { createAction } from '@/lib/actions/factory';
import {
  updateProfileSchema,
  updateProfileImageSchema,
} from '@/lib/data/profile/schemas';
import * as profileModel from '@/lib/data/profile/model';

export const getProfileImageAction = createAction({
  name: 'getProfileImage',
  module: 'profile',
  handler: async (_input: Record<string, never>, user) => {
    return await profileModel.getProfileImage(user.id);
  },
});

export const updateProfileAction = createAction({
  name: 'updateProfile',
  module: 'profile',
  schema: updateProfileSchema,
  revalidatePaths: ['/profile'],
  handler: async (input, user) => {
    const fullName = input.lastName
      ? `${input.firstName} ${input.lastName}`
      : input.firstName;
    await profileModel.updateUserName(user.id, fullName);
    return { name: fullName };
  },
});

export const updateProfileImageAction = createAction({
  name: 'updateProfileImage',
  module: 'profile',
  schema: updateProfileImageSchema,
  revalidatePaths: ['/profile'],
  handler: async (input, user) => {
    await profileModel.updateProfileImage(user.id, input.profileImage);
    return { success: true };
  },
});
