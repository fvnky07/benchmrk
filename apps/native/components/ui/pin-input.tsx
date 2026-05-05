import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type NativeSyntheticEvent,
  TextInput,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;

interface PinInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

function PinInput({
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}: Readonly<PinInputProps>) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(
    autoFocus ? 0 : null
  );

  // Shake animation
  const shakeX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shakeX]);

  // Trigger shake when error state changes to true
  useEffect(() => {
    if (error) {
      triggerShake();
    }
  }, [error, triggerShake]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    // Handle paste: if text is longer than 1 char
    if (text.length > 1) {
      const digits = text.replaceAll(/\D/g, '').slice(0, PIN_LENGTH);
      const newValue = [...value];
      for (const [i, digit_] of digits.entries()) {
        if (index + i < PIN_LENGTH) {
          newValue[index + i] = digit_;
        }
      }
      onChange(newValue);

      // Focus last filled box or last box
      const nextIndex = Math.min(index + digits.length, PIN_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();

      // Light haptic for each digit
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check if complete
      const fullCode = newValue.join('');
      if (fullCode.length === PIN_LENGTH && onComplete) {
        onComplete(fullCode);
      }
      return;
    }

    // Single digit entry
    const digit = text.replaceAll(/\D/g, '').slice(0, 1);
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);

    if (digit) {
      // Light haptic on each digit
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Auto-advance to next box
      if (index < PIN_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if complete after setting last digit
      if (index === PIN_LENGTH - 1 || newValue.every((d) => d !== '')) {
        const fullCode = newValue.join('');
        if (fullCode.length === PIN_LENGTH && onComplete) {
          onComplete(fullCode);
        }
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (disabled) return;

    if (e.nativeEvent.key === 'Backspace') {
      if (value[index] === '' && index > 0) {
        // Current box empty, go to previous and clear it
        const newValue = [...value];
        newValue[index - 1] = '';
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
      } else if (value[index] !== '') {
        // Current box has value, clear it
        const newValue = [...value];
        newValue[index] = '';
        onChange(newValue);
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <Animated.View
      style={animatedStyle}
      className="flex-row items-center justify-center gap-3"
    >
      {Array.from({ length: PIN_LENGTH }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const isFilled = value[index] !== '';

        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={value[index]}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={index === 0 ? PIN_LENGTH : 1}
            editable={!disabled}
            selectTextOnFocus
            className={cn(
              'h-14 w-12 rounded-lg border-2 text-center font-semibold text-2xl text-white',
              'bg-black-2',
              // Default border
              !isFocused && !isFilled && !error && 'border-input',
              // Focused border
              isFocused && !error && 'border-primary',
              // Filled border
              isFilled && !isFocused && !error && 'border-green-1',
              // Error border
              error && 'border-destructive',
              // Disabled
              disabled && 'opacity-50'
            )}
          />
        );
      })}
    </Animated.View>
  );
}

export type { PinInputProps };
export { PinInput };
