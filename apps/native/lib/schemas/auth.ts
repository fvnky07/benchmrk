import { z } from "zod";

// Email schema with normalization
export const emailSchema = z
	.string()
	.trim()
	.toLowerCase() // Normalize to lowercase
	.min(1, "Email is required")
	.email("Invalid email address");

// Strong password schema
export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(32, "Password is too long")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter")
	.regex(/[0-9]/, "Password must contain at least one number");

// Login schema (less strict password for existing users)
export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(2, "Password is required"),
});

// Register schema with password confirmation
export const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"], // Error on confirmPassword field
	});

// Forgot password schema
export const forgotPasswordSchema = z.object({
	email: emailSchema,
});

// 2FA verification schema
export const twoFactorSchema = z.object({
	code: z
		.string()
		.length(6, "Code must be 6 digits")
		.regex(/^\d{6}$/, "Code must contain only numbers"),
});

// Profile setup schema
export const profileSchema = z.object({
	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(20, "Username is too long")
		.regex(
			/^[a-zA-Z0-9_]+$/,
			"Username can only contain letters, numbers, and underscores",
		),
	bio: z.string().max(150, "Bio is too long").optional(),
});

// TypeScript types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
