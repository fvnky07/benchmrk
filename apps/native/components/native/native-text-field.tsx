import {
  Column,
  Text,
  TextInput,
  type TextInputProps,
  useNativeState,
} from '@expo/ui';
import { useEffect } from 'react';

import { font, space, textColor, useColors } from '@/lib/ui';

type NativeTextFieldProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  error?: string;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
};

export function NativeTextField({
  error,
  label,
  onChangeText,
  value,
  ...props
}: Readonly<NativeTextFieldProps>) {
  const colors = useColors();
  const nativeValue = useNativeState(value);

  useEffect(() => {
    if (nativeValue.value !== value) {
      nativeValue.value = value;
    }
  }, [nativeValue, value]);

  return (
    <Column spacing={space.sm}>
      <Text
        textStyle={{
          ...font.label,
          color: textColor(colors.onSurfaceVariant),
        }}
      >
        {label}
      </Text>
      <TextInput {...props} value={nativeValue} onChangeText={onChangeText} />
      {error ? (
        <Text textStyle={{ ...font.caption, color: textColor(colors.error) }}>
          {error}
        </Text>
      ) : null}
    </Column>
  );
}
