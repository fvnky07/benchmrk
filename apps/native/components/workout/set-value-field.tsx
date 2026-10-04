import { TextInput, type TextInputProps, useNativeState } from '@expo/ui';
import { useEffect } from 'react';

type SetValueFieldProps = Pick<
  TextInputProps,
  'placeholder' | 'keyboardType' | 'onBlur' | 'onFocus' | 'editable'
> & {
  value: string;
  onChangeText: (text: string) => void;
  width?: number;
};

/** A compact numeric field for one value of a Set row. */
export function SetValueField({
  value,
  onChangeText,
  width = 72,
  ...props
}: Readonly<SetValueFieldProps>) {
  const nativeValue = useNativeState(value);

  useEffect(() => {
    if (nativeValue.value !== value) {
      nativeValue.value = value;
    }
  }, [nativeValue, value]);

  return (
    <TextInput
      {...props}
      textAlign="center"
      style={{ width }}
      value={nativeValue}
      onChangeText={onChangeText}
    />
  );
}
