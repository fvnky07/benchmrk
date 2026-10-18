import { RNHostView, Row } from '@expo/ui';
import {
  accessibilityElement,
  accessibilityLabel,
} from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';
import { Platform, Text, View } from 'react-native';

import { pillColors } from '@/components/native/pill-chip';
import { accessibilityModifier, radius, size, useColors } from '@/lib/ui';

type GroupChipProps = {
  members: readonly { username: string; image: string | null }[];
  onPress: () => void;
};

const AVATAR_SIZE = 24;
const AVATAR_OVERLAP = 8;

/** The fixed Group pill before the quick actions: the members' avatars. */
export function GroupChip({ members, onPress }: Readonly<GroupChipProps>) {
  const colors = useColors();
  const { fill, on } = pillColors(colors, {});
  const label = `Group, members: ${members.map((member) => member.username).join(', ')}`;

  return (
    <Row
      alignment="center"
      onPress={onPress}
      style={{
        height: size.chip,
        paddingHorizontal: 6,
        borderRadius: radius.pill,
        backgroundColor: fill,
      }}
      modifiers={
        Platform.OS === 'ios'
          ? [accessibilityElement('ignore'), accessibilityLabel(label)]
          : [accessibilityModifier(label)]
      }
    >
      <RNHostView matchContents>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {members.slice(0, 4).map((member, index) => (
            <View
              key={member.username}
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                borderWidth: 1,
                borderColor: fill,
                backgroundColor: colors.surfaceContainerHighest,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: index === 0 ? 0 : -AVATAR_OVERLAP,
                overflow: 'hidden',
              }}
            >
              {member.image ? (
                <Image
                  source={{ uri: member.image }}
                  style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
                />
              ) : (
                <Text style={{ fontSize: 10, fontWeight: '700', color: on }}>
                  {member.username.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
          ))}
        </View>
      </RNHostView>
    </Row>
  );
}
