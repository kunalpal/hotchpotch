'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Save, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import SectionHeading from '@/components/ui/section-heading';
import { DetailsMarkup } from '@/components/layout/details-markup';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/data/profile/schemas';
import {
  useProfileImage,
  useUpdateProfile,
  useUpdateProfileImage,
} from '@/lib/hooks/use-profile-query';
import { ProfilePictureManagementDialog } from './ProfilePictureManagementDialog';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface ProfileOverviewProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Reads a File into a data-url for the cropper preview.
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName || '').trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

export function ProfileOverview({ user }: ProfileOverviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(true);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const { data: storedProfileImage } = useProfileImage({});
  const updateProfile = useUpdateProfile();
  const updateProfileImage = useUpdateProfileImage();

  // Display priority: stored profile image > Google OAuth image
  const displayImage = storedProfileImage ?? user.image ?? '';

  const { firstName, lastName } = splitName(user.name || '');

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName,
      lastName,
    },
  });

  const getInitials = () => {
    const first = form.getValues('firstName')?.[0] || '';
    const last = form.getValues('lastName')?.[0] || '';
    if (first && last) return `${first}${last}`.toUpperCase();
    return (first || '?').toUpperCase();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description:
          '<p>Please select an image file (JPEG, PNG, WebP, etc.).</p>',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: '<p>Please select an image under 2MB.</p>',
      });
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRawImageSrc(dataUrl);
      setCropDialogOpen(true);
    } catch {
      toast.error('Image processing failed', {
        description:
          '<p>Could not process the selected image. Try a different file.</p>',
      });
    }

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedBase64: string) => {
    updateProfileImage.mutate(
      { profileImage: croppedBase64 },
      {
        onSettled: () => {
          setCropDialogOpen(false);
          setRawImageSrc(null);
        },
      }
    );
  };

  const handleRemoveImage = () => {
    updateProfileImage.mutate({ profileImage: '' });
  };

  const onSubmit = (data: UpdateProfileInput) => {
    updateProfile.mutate(data);
  };

  return (
    <div className="space-y-4">
      <SectionHeading title="Profile Overview" />
      <DetailsMarkup text="Manage your ==display name== and profile picture shown across the app. Changes take effect immediately.\n**Email address** is tied to your sign-in provider and cannot be changed here." />

      <div className="mt-8! max-w-md">
        <div className="space-y-4">
          {/* Profile Picture */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Profile Picture</p>
            <div className="flex items-center gap-4">
              <div className="group relative">
                <Avatar className="border-background dark:border-foreground h-20 w-20 border-2 shadow-md">
                  <AvatarImage src={displayImage} alt="Profile" />
                  <AvatarFallback className="text-xl font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={updateProfileImage.isPending}
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Update profile picture"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
              </div>
              {storedProfileImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleRemoveImage}
                  disabled={updateProfileImage.isPending}
                  icon={Trash}
                >
                  Remove Image
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Allowed image formats are JPEG, PNG, or WebP. Maximum allowed size
            is 2MB.
          </p>

          {/* Name Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="First name"
                        className="bg-card"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Last name"
                        className="bg-card"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={user.email || ''} disabled className="bg-muted" />
                <p className="text-muted-foreground text-xs">
                  Email is managed by your sign-in provider and cannot be
                  changed here.
                </p>
              </div>

              <div className="flex justify-start pt-3">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !form.formState.isDirty}
                  loading={updateProfile.isPending}
                  icon={Save}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {rawImageSrc && (
        <ProfilePictureManagementDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open) setRawImageSrc(null);
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          isSaving={updateProfileImage.isPending}
        />
      )}
    </div>
  );
}
