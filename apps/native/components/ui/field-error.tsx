import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  return (
    <View className={cn('mt-1.5 px-1', className)}>
      <Text className="text-destructive text-xs">{error}</Text>
    </View>
  );
}
