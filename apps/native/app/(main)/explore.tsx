import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { ScreenTitle } from '@/components/native/screen-title';

export default function ExploreScreen() {
  return (
    <NativeScreen edges={['top']}>
      <ScreenTitle
        title="Explore"
        subtitle="Discover athletes and training content."
      />
      <Card divided>
        <CardRow supportingText="Search, discovery, filters, and browsing are not available yet.">
          Explore is coming soon
        </CardRow>
      </Card>
    </NativeScreen>
  );
}
