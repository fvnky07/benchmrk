import {
  Column,
  Text,
  TextInput,
  type TextInputProps,
  useNativeState,
} from '@expo/ui';
import { useEffect } from 'react';

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
  const nativeValue = useNativeState(value);

  useEffect(() => {
    if (nativeValue.value !== value) {
      nativeValue.value = value;
    }
  }, [nativeValue, value]);

  return (
    <Column spacing={8}>
      <Text textStyle={{ fontSize: 16, fontWeight: '600' }}>{label}</Text>
      <TextInput {...props} value={nativeValue} onChangeText={onChangeText} />
      {error ? (
        <Text textStyle={{ color: 'red', fontSize: 14 }}>{error}</Text>
      ) : null}
    </Column>
  );
}
