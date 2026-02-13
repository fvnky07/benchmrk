// NOTE: Input component for React Native with proper className support
// For backgroundColor on native, use style prop or explicit color classes
import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
  className?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={
          placeholderTextColor ??
          Platform.select({
            web: undefined, // Let CSS handle it
            default: '#9CA3AF', // gray-400 for native
          })
        }
        className={cn(
          'h-10 w-full rounded-md border border-input px-3 py-2 text-base text-foreground',
          // NOTE: On native, bg-* classes may not work on TextInput
          // Use style prop for backgroundColor or wrap in a View
          Platform.select({
            web: cn(
              'shadow-black/5 bg-background shadow-sm',
              'placeholder:text-muted-foreground',
              'selection:bg-primary selection:text-primary-foreground',
              'outline-none transition-[color,box-shadow]',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/20'
            ),
            default: '', // Native: use explicit colors in className or style prop
          }),
          props.editable === false && 'opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
