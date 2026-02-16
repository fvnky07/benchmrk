import { useState } from 'react';

import { z } from 'zod';

import { showToast } from '@/lib/toast';

interface UseFormValidationOptions<T extends z.ZodTypeAny> {
  schema: T;
  mode?: 'onSubmit' | 'onChange' | 'onBlur';
}

export function useFormValidation<T extends z.ZodTypeAny>({
  schema,
  mode = 'onSubmit',
}: UseFormValidationOptions<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const validate = (data: unknown): { success: boolean; data?: z.infer<T> } => {
    const result = schema.safeParse(data);

    if (!result.success) {
      // Convert Zod errors to field-specific object
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return { success: false };
    }

    // Clear errors on successful validation
    setErrors({});
    return { success: true, data: result.data };
  };

  const validateField = (fieldName: string, value: unknown) => {
    // Only validate after first submit in onChange mode
    if (mode === 'onChange' && !hasSubmitted) return;

    try {
      // Validate single field (if schema supports it)
      const result = schema.safeParse({ [fieldName]: value });
      if (
        result.success ||
        !result.error.issues.find((issue) => issue.path[0] === fieldName)
      ) {
        clearError(fieldName);
      } else {
        const error = result.error.issues.find(
          (issue) => issue.path[0] === fieldName
        );
        if (error) {
          setErrors((prev) => ({ ...prev, [fieldName]: error.message }));
        }
      }
    } catch {
      // Schema doesn't support partial validation
    }
  };

  const handleSubmit = (
    data: unknown,
    onSuccess?: (data: z.infer<T>) => void | Promise<void>
  ) => {
    setHasSubmitted(true);
    const result = schema.safeParse(data);

    if (!result.success) {
      // Convert Zod errors to field-specific object
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);

      // Show toast with first error message
      const firstError = Object.values(fieldErrors)[0];
      if (firstError) {
        // TODO: show a more specific error message instead of just validation error
        showToast.error('Validation Error', firstError);
        console.log(firstError);
      }
      return false;
    }

    // Clear errors on successful validation
    setErrors({});

    if (onSuccess && result.data) {
      onSuccess(result.data);
    }

    return true;
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearErrors = () => {
    setErrors({});
    setHasSubmitted(false);
  };

  return {
    errors,
    validate,
    validateField,
    handleSubmit,
    clearError,
    clearErrors,
    hasSubmitted,
  };
}
