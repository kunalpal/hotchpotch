import { z } from 'zod';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB in base64

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateProfileImageSchema = z.object({
  /** base64 data URI (data:image/...;base64,...) or empty string to remove */
  profileImage: z
    .string()
    .max(MAX_IMAGE_SIZE_BYTES, 'Image must be under 2MB')
    .refine(
      (val) => val === '' || val.startsWith('data:image/'),
      'Invalid image format'
    ),
});

export type UpdateProfileImageInput = z.infer<typeof updateProfileImageSchema>;
