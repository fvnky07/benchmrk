import type { RegisterInput } from '@/lib/schemas/auth';

import { authClient } from './client';

type RegistrationInput = Pick<RegisterInput, 'email' | 'password'>;

export async function registerWithEmail({
  email,
  password,
}: RegistrationInput) {
  const result = await authClient.signUp.email({
    email,
    name: email.split('@')[0],
    password,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Unable to create account.');
  }

  if (!result.data) {
    throw new Error('Unable to create account.');
  }

  return result.data;
}
