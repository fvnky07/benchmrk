import { ListItem, Text } from '@expo/ui';

import { NativeScreen } from '@/components/native/native-screen';

export default function ExploreScreen() {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>Explore</Text>
      <Text textStyle={{ fontSize: 17 }}>
        Discover athletes and training content.
      </Text>
      <ListItem supportingText="Search, discovery, filters, and browsing are not available yet.">
        Explore is coming soon
      </ListItem>
    </NativeScreen>
  );
}
