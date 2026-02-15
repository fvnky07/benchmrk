import { z } from 'zod';

// Email schema with normalization
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase() // Normalize to lowercase
  .min(1, 'Email is required')
  .email('Invalid email address');

// Strong password schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Login schema (less strict password for existing users)
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Register schema with password confirmation
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // Error on confirmPassword field
  });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// TypeScript types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
