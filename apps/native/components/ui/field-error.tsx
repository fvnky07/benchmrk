import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { cn } from '@/lib/utils';

interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  return (
    <View className={cn('mt-1.5 px-1', className)}>
      <Text className="text-xs text-destructive">{error}</Text>
    </View>
  );
}
