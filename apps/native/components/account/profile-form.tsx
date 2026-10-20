import PhotoCameraIcon from '@expo/material-symbols/photo_camera.xml';
import PhotoLibraryIcon from '@expo/material-symbols/photo_library.xml';
import { Button, Column, RNHostView, Row, Spacer, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeTextField } from '@/components/native/native-text-field';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { analytics } from '@/lib/analytics';
import { authErrorCopy } from '@/lib/auth/error-copy';
import {
  font,
  size,
  space,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { errorCode } from '@/lib/workout/format';

const CHOOSE_PHOTO_ICON = { ios: 'photo', android: PhotoLibraryIcon } as const;
const TAKE_PHOTO_ICON = { ios: 'camera', android: PhotoCameraIcon } as const;
const BIO_MAX_LENGTH = 150;
const NAME_MAX_LENGTH = 50;

const ERROR_COPY: Record<string, string> = {
  INVALID_NAME: `Names are 1–${NAME_MAX_LENGTH} characters.`,
  INVALID_USERNAME:
    'Usernames are 3–20 letters, numbers or underscores, without spaces or accents.',
  USERNAME_TAKEN: 'That username is taken. Try another.',
  BIO_TOO_LONG: `Bios can be up to ${BIO_MAX_LENGTH} characters.`,
};

type ProfileFormProps = {
  /** Profile setup offers the assigned username; editing starts from the saved profile. */
  mode: 'setup' | 'edit';
  onSaved?: () => void;
};

/** The member's photo as a 96pt circle, or their initials when there is none. */
export function ProfileAvatar({
  image,
  initials,
}: Readonly<{ image: string | null; initials: string }>) {
  const colors = useColors();

  if (image) {
    return (
      <RNHostView matchContents>
        <Image
          accessibilityLabel="Profile photo"
          source={{ uri: image }}
          style={{
            width: size.avatar,
            height: size.avatar,
            borderRadius: size.avatar / 2,
          }}
        />
      </RNHostView>
    );
  }

  return (
    <Column
      alignment="center"
      style={{
        width: size.avatar,
        height: size.avatar,
        borderRadius: size.avatar / 2,
        backgroundColor: colors.surfaceContainerHigh,
      }}
    >
      <Spacer flexible />
      <Text textStyle={{ ...font.title, color: textColor(colors.onSurface) }}>
        {initials}
      </Text>
      <Spacer flexible />
    </Column>
  );
}

/** Name, username, bio and photo, for Profile setup and for editing in settings. */
export function ProfileForm({ mode, onSaved }: Readonly<ProfileFormProps>) {
  const colors = useColors();
  const contentWidth = useContentWidth();
  const profile = useQuery(api.profile.getCurrentProfile);
  const suggested = useQuery(
    api.profile.suggestUsername,
    mode === 'setup' ? {} : 'skip'
  );
  const generateUploadUrl = useMutation(api.profile.generateUploadUrl);
  const updateProfile = useMutation(api.profile.updateProfile);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<Id<'_storage'> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingAssigned, setIsConfirmingAssigned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAvailable = useQuery(
    api.profile.checkUsername,
    username.length >= 3 ? { username } : 'skip'
  );

  useEffect(() => {
    if (!profile) return;
    setName((current) => current || profile.name);
    if (mode === 'edit') {
      setUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
    }
  }, [mode, profile]);

  useEffect(() => {
    if (mode === 'setup' && suggested) {
      setUsername((current) => current || suggested);
    }
  }, [mode, suggested]);

  const upload = async (uri: string) => {
    try {
      setIsUploading(true);
      setErrorMessage(null);
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(uri)).blob();
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });
      if (!result.ok) throw new Error('Photo upload failed');
      const response: unknown = await result.json();
      if (
        typeof response !== 'object' ||
        response === null ||
        !('storageId' in response) ||
        typeof response.storageId !== 'string' ||
        response.storageId.length === 0
      ) {
        throw new Error('Photo upload returned an invalid storage ID');
      }
      setPhotoUri(uri);
      setPhotoId(response.storageId as Id<'_storage'>);
      analytics.profilePhotoUploaded();
    } catch {
      setErrorMessage('Couldn’t upload that photo. Try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const pickPhoto = async (source: 'library' | 'camera') => {
    const permission =
      source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage(
        source === 'library'
          ? 'Allow photo access in Settings to choose a profile photo.'
          : 'Allow camera access in Settings to take a profile photo.'
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync(options)
        : await ImagePicker.launchCameraAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) await upload(asset.uri);
  };

  const save = async (chosenUsername: string) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateProfile({
        name: name.trim(),
        username: chosenUsername,
        bio: bio.trim() || (mode === 'edit' ? '' : undefined),
        imageStorageId: photoId ?? undefined,
      });
      if (mode === 'setup') {
        analytics.profileCompleted(photoId !== null, bio.trim() !== '');
      } else {
        analytics.profileEdited();
      }
      onSaved?.();
    } catch (error) {
      setErrorMessage(
        ERROR_COPY[errorCode(error) ?? ''] ??
          authErrorCopy(
            errorCode(error),
            'Couldn’t save your profile. Try again.'
          )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const image = photoUri ?? profile?.image ?? null;
  const initials = (profile?.name || profile?.email || '?')
    .slice(0, 2)
    .toUpperCase();
  const usernameStatus =
    username.length < 3
      ? 'At least 3 characters'
      : isAvailable === undefined
        ? 'Checking…'
        : isAvailable
          ? 'Available'
          : 'Taken';

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };

  return (
    <Column spacing={space.lg}>
      <Column
        alignment="center"
        spacing={space.md}
        style={{ width: contentWidth }}
      >
        <ProfileAvatar image={image} initials={initials} />
        <Row spacing={space.sm}>
          <PillChip
            disabled={isUploading}
            icon={CHOOSE_PHOTO_ICON}
            label="Choose photo"
            onPress={() => void pickPhoto('library')}
          />
          <PillChip
            disabled={isUploading}
            icon={TAKE_PHOTO_ICON}
            label="Take photo"
            onPress={() => void pickPhoto('camera')}
          />
        </Row>
        {isUploading ? <Text textStyle={caption}>Uploading…</Text> : null}
      </Column>
      <Card padding={space.lg} spacing={space.md}>
        <NativeTextField
          autoCapitalize="words"
          label="Name"
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChangeText={setName}
        />
        <NativeTextField
          autoCapitalize="none"
          autoCorrect={false}
          label="Username"
          maxLength={20}
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase())}
        />
        <Text textStyle={caption}>{usernameStatus}</Text>
        <NativeTextField
          label="Bio (optional)"
          maxLength={BIO_MAX_LENGTH}
          multiline
          numberOfLines={3}
          value={bio}
          onChangeText={setBio}
        />
        <Text textStyle={caption}>{`${bio.length}/${BIO_MAX_LENGTH}`}</Text>
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Not saved</CardRow>
        </Card>
      ) : null}
      <PrimaryButton
        disabled={
          isSaving || isUploading || isAvailable !== true || name.trim() === ''
        }
        label={
          isSaving ? 'Saving…' : mode === 'setup' ? 'Continue' : 'Save profile'
        }
        onPress={() => void save(username)}
      />
      {mode === 'setup' && suggested ? (
        isConfirmingAssigned ? (
          <Card tone="high" padding={space.lg} spacing={space.md}>
            <Column spacing={2}>
              <Text
                textStyle={{
                  ...font.bodyStrong,
                  color: textColor(colors.onSurface),
                }}
              >
                Use this username?
              </Text>
              <Text textStyle={caption}>
                {`Your username will be @${suggested}. You can change it later in settings.`}
              </Text>
            </Column>
            <Column spacing={space.sm}>
              <Button
                disabled={isSaving}
                label={`Confirm @${suggested}`}
                onPress={() => {
                  analytics.profileSkipped();
                  void save(suggested);
                }}
              />
              <Button
                label="Choose another"
                variant="outlined"
                onPress={() => setIsConfirmingAssigned(false)}
              />
            </Column>
          </Card>
        ) : (
          <Button
            label={`Skip and use @${suggested}`}
            variant="text"
            onPress={() => setIsConfirmingAssigned(true)}
          />
        )
      ) : null}
    </Column>
  );
}
