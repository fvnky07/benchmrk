import { Column, Text } from '@expo/ui';

import { ProfileAvatar } from '@/components/account/profile-form';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { font, space, textColor, useColors, useContentWidth } from '@/lib/ui';

export default function ProfileScreen() {
  const colors = useColors();
  const contentWidth = useContentWidth();
  const { avatarUrl, bio, initials } = useUserProfile();

  return (
    <NativeScreen>
      <Column
        alignment="center"
        spacing={space.md}
        style={{ width: contentWidth }}
      >
        <ProfileAvatar image={avatarUrl} initials={initials} />
        {bio ? (
          <Text
            textStyle={{
              ...font.body,
              color: textColor(colors.onSurfaceVariant),
              textAlign: 'center',
            }}
          >
            {bio}
          </Text>
        ) : null}
      </Column>
      <Card divided>
        <CardRow supportingText="Workout totals, follows, activity, and training history are not available yet.">
          Profile insights
        </CardRow>
        <CardRow supportingText="Your existing profile details remain available here while live profile statistics are being built.">
          More profile data coming soon
        </CardRow>
      </Card>
    </NativeScreen>
  );
}
