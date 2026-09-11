import { authClient } from '@/lib/auth/client';

jest.mock('@/lib/auth/client', () => ({
  authClient: {
    signUp: {
      email: jest.fn(),
    },
  },
}));

import { registerWithEmail } from '@/lib/auth/registration';
import { registerSchema } from '@/lib/schemas/auth';

const mockSignUpEmail = authClient.signUp.email as jest.Mock;

describe('registration', () => {
  beforeEach(() => {
    mockSignUpEmail.mockReset();
  });

  it('validates the complete form and points mismatches at confirmation', () => {
    const result = registerSchema.safeParse({
      email: '  PERSON@EXAMPLE.COM ',
      password: 'StrongPass1',
      confirmPassword: 'DifferentPass1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Passwords don't match",
            path: ['confirmPassword'],
          }),
        ])
      );
    }
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it('normalizes validated email before requiring a successful auth response', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'user_123' } },
      error: null,
    });
    const { email, password } = registerSchema.parse({
      email: '  PERSON@EXAMPLE.COM ',
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
    });

    await expect(registerWithEmail({ email, password })).resolves.toEqual({
      user: { id: 'user_123' },
    });

    expect(mockSignUpEmail).toHaveBeenCalledWith({
      email: 'person@example.com',
      name: 'person',
      password: 'StrongPass1',
    });
  });

  it('keeps server failures retryable instead of treating an error response as success', async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { message: 'Email is already registered' },
    });

    await expect(
      registerWithEmail({
        email: 'person@example.com',
        password: 'StrongPass1',
      })
    ).rejects.toThrow('Email is already registered');
  });
});
