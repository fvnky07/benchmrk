import { Feather } from "@expo/vector-icons";
import { api } from "@repo/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	TextInput as RNTextInput,
	View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { useFormValidation } from "@/lib/hooks/use-form-validation";
import { profileSchema } from "@/lib/schemas/auth-schemas";
import { showToast } from "@/lib/toast";

export default function CreateProfileScreen() {
	const [username, setUsername] = useState("");
	const [bio, setBio] = useState("");
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [imageStorageId, setImageStorageId] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const session = authClient.useSession();
	const userId = session.data?.user?.id;

	const generateUploadUrl = useMutation(api.profile.generateUploadUrl);
	const updateProfile = useMutation(api.profile.updateProfile);
	const checkUsername = useQuery(
		api.profile.checkUsername,
		username.length >= 3 ? { username } : "skip",
	);

	const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
		schema: profileSchema,
		mode: "onChange",
	});

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			showToast.error(
				"Permission denied",
				"We need camera roll permissions to select a profile picture",
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
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
		if (status !== "granted") {
			showToast.error(
				"Permission denied",
				"We need camera permissions to take a photo",
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

	const uploadImage = async (uri: string) => {
		try {
			setIsUploading(true);

			// Get upload URL from Convex
			const uploadUrl = await generateUploadUrl();

			// Fetch the image and convert to blob
			const response = await fetch(uri);
			const blob = await response.blob();

			// Upload to Convex storage
			const result = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": blob.type },
				body: blob,
			});

			const json = (await result.json()) as { storageId: string };
			setImageStorageId(json.storageId);

			showToast.success(
				"Image uploaded",
				"Profile picture uploaded successfully",
			);
		} catch (error) {
			showToast.error(
				"Upload failed",
				error instanceof Error ? error.message : "Failed to upload image",
			);
			setImageUri(null);
		} finally {
			setIsUploading(false);
		}
	};

	const onSubmit = () => {
		if (!userId) {
			showToast.error("Error", "User not authenticated");
			return;
		}

		// Check username availability
		if (checkUsername === false) {
			showToast.error("Username taken", "This username is already in use");
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

				// Navigate to main app index
				setTimeout(() => {
					router.replace("/(main)");
				}, 300);
			} catch (error) {
				showToast.error(
					"Update failed",
					error instanceof Error ? error.message : "Failed to update profile",
				);
			} finally {
				setIsSubmitting(false);
			}
		});
	};

	const onSkip = async () => {
		if (!userId) {
			showToast.error("Error", "User not authenticated");
			return;
		}

		try {
			setIsSubmitting(true);

			// Generate username from email
			const email = session.data?.user?.email || "";
			const autoUsername =
				email.split("@")[0] + Math.floor(Math.random() * 1000);

			await updateProfile({
				userId,
				username: autoUsername,
			});

			// Navigate to main app index
			setTimeout(() => {
				router.replace("/(main)");
			}, 300);
		} catch (error) {
			showToast.error(
				"Error",
				error instanceof Error ? error.message : "Failed to skip profile setup",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getInitials = () => {
		const name = session.data?.user?.name || session.data?.user?.email || "?";
		return name.substring(0, 2).toUpperCase();
	};

	const isUsernameAvailable = checkUsername === true;
	const showUsernameCheck = username.length >= 3 && hasSubmitted;

	return (
		<SafeAreaView className="flex-1 bg-black-1" edges={["top"]}>
			<KeyboardAwareScrollView
				className="flex-1 px-6"
				contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
			>
				<View className="flex w-full items-center justify-center gap-6 pt-8">
					<View className="flex w-full items-center justify-center gap-2">
						<Text className="text-3xl font-bold">Complete Your Profile</Text>
						<Text className="text-center text-gray-400">
							Choose a profile picture and username
						</Text>
					</View>

					{/* Profile Picture */}
					<View className="flex items-center justify-center gap-4">
						<Avatar className="size-32">
							{imageUri ? (
								<AvatarImage source={{ uri: imageUri }} />
							) : (
								<AvatarFallback className="bg-blue-600">
									<Text className="text-4xl font-bold text-white">
										{getInitials()}
									</Text>
								</AvatarFallback>
							)}
						</Avatar>

						<View className="flex flex-row gap-3">
							<Pressable
								onPress={pickImage}
								disabled={isUploading}
								className="rounded-lg bg-blue-600 px-4 py-2 active:opacity-70"
							>
								<Text className="text-white">Choose Photo</Text>
							</Pressable>
							<Pressable
								onPress={takePhoto}
								disabled={isUploading}
								className="rounded-lg bg-gray-700 px-4 py-2 active:opacity-70"
							>
								<Text className="text-white">Take Photo</Text>
							</Pressable>
						</View>
						{isUploading && <ActivityIndicator size="small" color="#3b82f6" />}
					</View>

					{/* Username Input */}
					<View className="w-full gap-1">
						<View className="relative">
							<Input
								value={username}
								onChangeText={(text) => {
									setUsername(text);
									if (hasSubmitted) clearError("username");
								}}
								placeholder="Username"
								autoCapitalize="none"
								autoComplete="username"
								autoCorrect={false}
								style={{ backgroundColor: "#202020" }}
								className="h-12"
								aria-invalid={!!errors.username}
							/>
							{showUsernameCheck && (
								<View className="absolute right-3 top-3">
									{isUsernameAvailable ? (
										<Feather name="check-circle" size={20} color="#10b981" />
									) : (
										<Feather name="x-circle" size={20} color="#ef4444" />
									)}
								</View>
							)}
						</View>
						{errors.username && (
							<Text className="pl-2 text-sm text-red-400">
								{errors.username}
							</Text>
						)}
						{showUsernameCheck && !errors.username && (
							<Text
								className={`pl-2 text-sm ${isUsernameAvailable ? "text-green-400" : "text-red-400"}`}
							>
								{isUsernameAvailable
									? "Username is available"
									: "Username is already taken"}
							</Text>
						)}
					</View>

					{/* Bio Input */}
					<View className="w-full gap-1">
						<RNTextInput
							value={bio}
							onChangeText={(text) => {
								if (text.length <= 150) {
									setBio(text);
									if (hasSubmitted) clearError("bio");
								}
							}}
							placeholder="Bio (optional)"
							placeholderTextColor="#888"
							multiline
							numberOfLines={3}
							maxLength={150}
							style={{
								backgroundColor: "#202020",
								color: "white",
								padding: 12,
								borderRadius: 8,
								minHeight: 80,
								textAlignVertical: "top",
							}}
						/>
						<Text className="pl-2 text-right text-sm text-gray-400">
							{bio.length}/150
						</Text>
						{errors.bio && (
							<Text className="pl-2 text-sm text-red-400">{errors.bio}</Text>
						)}
					</View>
				</View>

				<View className="flex-1" />

				{/* Actions */}
				<View className="mb-6 flex w-full items-center justify-center gap-4">
					<Button
						className="w-full"
						onPress={onSubmit}
						disabled={isSubmitting || isUploading || !username}
					>
						{isSubmitting ? (
							<ActivityIndicator size="small" color="black" />
						) : (
							<>
								<Text>Complete Profile</Text>
								<Feather name="arrow-right" size={24} color="black" />
							</>
						)}
					</Button>

					<Pressable onPress={onSkip} disabled={isSubmitting}>
						<Text className="text-blue-400">Skip for now</Text>
					</Pressable>
				</View>
			</KeyboardAwareScrollView>
		</SafeAreaView>
	);
}
