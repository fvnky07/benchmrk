import { ListItem, Text } from '@expo/ui';

import { NativeScreen } from '@/components/native/native-screen';

/**
 * A discoverable capability that cannot currently be used: it explains why and
 * exposes no action that simulates completion or promises a delivery date.
 */
export function UnavailableCapability({
  title,
  explanation,
}: Readonly<{ title: string; explanation: string }>) {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>{title}</Text>
      <ListItem supportingText={explanation}>Unavailable</ListItem>
    </NativeScreen>
  );
}
