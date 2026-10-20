import { Card, CardRow } from '@/components/native/card';
import {
  NativeScreen,
  type ScreenEdge,
} from '@/components/native/native-screen';
import { ScreenTitle } from '@/components/native/screen-title';

/**
 * A discoverable capability that cannot currently be used: it explains why and
 * exposes no action that simulates completion or promises a delivery date.
 */
export function UnavailableCapability({
  title,
  explanation,
  edges,
}: Readonly<{
  title: string;
  explanation: string;
  edges?: readonly ScreenEdge[];
}>) {
  return (
    <NativeScreen edges={edges}>
      <ScreenTitle title={title} />
      <Card>
        <CardRow supportingText={explanation}>Unavailable</CardRow>
      </Card>
    </NativeScreen>
  );
}
