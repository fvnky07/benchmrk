import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { useColorScheme } from 'nativewind';
import {
  Platform,
  Pressable,
  type PressableProps,
  View,
  type ViewStyle,
} from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { COLORS } from '@/theme/colors';
import { withOpacity } from '@/theme/with-opacity';

const buttonVariants = cva('flex-row items-center justify-center gap-2', {
  variants: {
    variant: {
      primary: 'bg-primary ios:active:opacity-80',
      secondary:
        'border border-foreground/40 ios:border-primary ios:active:bg-primary/5',
      tonal:
        'bg-primary/15 ios:bg-primary/10 ios:active:bg-primary/15 dark:bg-primary/30 dark:ios:bg-primary/10',
      plain: 'ios:active:opacity-70',
    },
    size: {
      none: '',
      sm: 'rounded-full px-2.5 py-1',
      md: 'ios:rounded-lg rounded-full ios:px-3.5 px-5 ios:py-1.5 py-2',
      lg: 'gap-2 rounded-xl px-5 ios:py-2 py-2.5',
      icon: 'h-10 w-10 ios:rounded-lg rounded-full',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const androidRootVariants = cva('overflow-hidden', {
  variants: {
    size: {
      none: '',
      icon: 'rounded-full',
      sm: 'rounded-full',
      md: 'rounded-full',
      lg: 'rounded-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const buttonTextVariants = cva('font-medium', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'ios:text-primary text-foreground',
      tonal: 'ios:text-primary text-foreground',
      plain: 'text-foreground',
    },
    size: {
      none: '',
      icon: '',
      sm: 'text-[15px] leading-5',
      md: 'text-[17px] leading-7',
      lg: 'text-[17px] leading-7',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const ANDROID_RIPPLE = {
  dark: {
    primary: { color: withOpacity(COLORS.dark.grey3, 0.4), borderless: false },
    secondary: {
      color: withOpacity(COLORS.dark.grey5, 0.8),
      borderless: false,
    },
    plain: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
    tonal: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
  },
  light: {
    primary: { color: withOpacity(COLORS.light.grey4, 0.4), borderless: false },
    secondary: {
      color: withOpacity(COLORS.light.grey5, 0.4),
      borderless: false,
    },
    plain: { color: withOpacity(COLORS.light.grey5, 0.4), borderless: false },
    tonal: { color: withOpacity(COLORS.light.grey6, 0.4), borderless: false },
  },
};

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
const BORDER_CURVE: ViewStyle = {
  borderCurve: 'continuous',
};

type ButtonVariantProps = Omit<
  VariantProps<typeof buttonVariants>,
  'variant'
> & {
  variant?: Exclude<VariantProps<typeof buttonVariants>['variant'], null>;
};

type AndroidOnlyButtonProps = {
  /**
   * ANDROID ONLY: The class name of root responsible for hidding the ripple overflow.
   */
  androidRootClassName?: string;
};

type ButtonProps = PressableProps & ButtonVariantProps & AndroidOnlyButtonProps;

const Root = Platform.OS === 'android' ? View : Slot.Pressable;

function Button({
  className,
  variant = 'primary',
  size,
  style = BORDER_CURVE,
  androidRootClassName,
  ...props
}: ButtonProps) {
  const { colorScheme } = useColorScheme();

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Root
        className={Platform.select({
          ios: undefined,
          default: androidRootVariants({
            size,
            className: androidRootClassName,
          }),
        })}
      >
        <Pressable
          className={cn(
            props.disabled && 'opacity-50',
            buttonVariants({ variant, size, className })
          )}
          style={style}
          android_ripple={ANDROID_RIPPLE[colorScheme ?? 'light'][variant]}
          {...props}
        />
      </Root>
    </TextClassContext.Provider>
  );
}

export type { ButtonProps };
export { Button, buttonTextVariants, buttonVariants };
