import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { analytics } from '@/lib/analytics';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { profileSchema } from '@/lib/schemas/auth';

export default function CreateProfileScreen() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageStorageId, setImageStorageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { user } = useUserProfile();
  const userId = user?.id as string | undefined;

  const generateUploadUrl = useMutation(api.profile.generateUploadUrl);
  const updateProfile = useMutation(api.profile.updateProfile);
  const checkUsername = useQuery(
    api.profile.checkUsername,
    username.length >= 3 ? { username } : 'skip'
  );

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: profileSchema,
    mode: 'onChange',
  });

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      setErrorMessage(null);

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Could not read the selected image.');
      }

      const blob = await response.blob();
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });
      if (!result.ok) {
        throw new Error('Could not upload the selected image.');
      }

      const json = (await result.json()) as { storageId: string };

      setImageStorageId(json.storageId);
      analytics.profilePhotoUploaded();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to upload image.'
      );
      setImageUri(null);
      setImageStorageId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage(
        'Camera-roll permission is required to select a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadImage(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage(
        'Camera permission is required to take a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await uploadImage(uri);
    }
  };

  const onSubmit = () => {
    setErrorMessage(null);

    if (!userId) {
      setErrorMessage('You must be signed in to complete your profile.');
      return;
    }
    if (checkUsername === false) {
      setErrorMessage('This username is already in use.');
      return;
    }

    handleSubmit({ username, bio: bio || undefined }, async () => {
      try {
        setIsSubmitting(true);
        await updateProfile({
          userId,
          username,
          bio: bio || undefined,
          imageStorageId: imageStorageId || undefined,
        });

        analytics.profileCompleted(!!imageStorageId, !!bio);
        setTimeout(() => {
          router.replace('/(main)');
        }, 300);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to update profile.'
        );
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const onSkip = async () => {
    if (!userId) {
      setErrorMessage('You must be signed in to skip profile setup.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const email = (user?.email as string) || '';
      const autoUsername =
        email.split('@')[0] + Math.floor(Math.random() * 1000);

      await updateProfile({ userId, username: autoUsername });
      analytics.profileSkipped();
      setTimeout(() => {
        router.replace('/(main)');
      }, 300);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to skip profile setup.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = ((user?.name as string) || (user?.email as string) || '?')
    .slice(0, 2)
    .toUpperCase();
  const isUsernameAvailable = checkUsername === true;
  const showUsernameCheck = username.length >= 3 && hasSubmitted;

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>
        Complete your profile
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        Add a username and an optional profile picture.
      </Text>
      {imageUri ? (
        <Image
          accessibilityLabel="Selected profile picture"
          source={{ uri: imageUri }}
          style={{ width: 128, height: 128, borderRadius: 64 }}
        />
      ) : (
        <ListItem supportingText="A profile picture is optional.">
          {initials}
        </ListItem>
      )}
      <Button
        disabled={isUploading}
        label="Choose photo"
        variant="outlined"
        onPress={pickImage}
      />
      <Button
        disabled={isUploading}
        label="Take photo"
        variant="outlined"
        onPress={takePhoto}
      />
      {isUploading ? (
        <ListItem supportingText="Uploading profile picture…">
          Uploading photo
        </ListItem>
      ) : null}
      <NativeTextField
        autoCapitalize="none"
        autoComplete="username"
        autoCorrect={false}
        error={errors.username}
        label="Username"
        onChangeText={(value) => {
          setUsername(value);
          if (hasSubmitted) clearError('username');
        }}
        placeholder="Username"
        value={username}
      />
      {showUsernameCheck && !errors.username ? (
        <ListItem
          supportingText={
            isUsernameAvailable
              ? 'This username is available.'
              : 'This username is already taken.'
          }
        >
          Username availability
        </ListItem>
      ) : null}
      <NativeTextField
        autoCapitalize="sentences"
        autoCorrect
        error={errors.bio}
        label="Bio (optional)"
        maxLength={150}
        multiline
        numberOfLines={3}
        onChangeText={(value) => {
          setBio(value);
          if (hasSubmitted) clearError('bio');
        }}
        placeholder="Tell people about your training"
        value={bio}
      />
      <Text textStyle={{ fontSize: 14 }}>{`${bio.length}/150`}</Text>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Could not update profile
        </ListItem>
      ) : null}
      <Button
        disabled={isSubmitting || isUploading || username.length === 0}
        label={isSubmitting ? 'Saving profile…' : 'Complete profile'}
        onPress={onSubmit}
      />
      <Button
        disabled={isSubmitting}
        label="Skip for now"
        variant="text"
        onPress={onSkip}
      />
    </NativeScreen>
  );
}
