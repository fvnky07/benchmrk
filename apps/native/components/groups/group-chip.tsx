import { Button, RNHostView } from '@expo/ui';
import { AssistChip } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityElement,
  accessibilityLabel,
  buttonBorderShape,
} from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';
import { Platform, Text, View } from 'react-native';

import { useColors } from '@/lib/ui';

type GroupChipProps = {
  members: readonly { username: string; image: string | null }[];
  onPress: () => void;
};

const AVATAR_SIZE = 24;
const AVATAR_OVERLAP = 8;

/** The fixed Group chip uses the same native surfaces as QuickActionChip. */
export function GroupChip({ members, onPress }: Readonly<GroupChipProps>) {
  const colors = useColors();
  const label = `Group, members: ${members.map((member) => member.username).join(', ')}`;
  const avatars = (
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
              borderColor: colors.surface,
              backgroundColor: colors.surfaceContainerHigh,
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
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: colors.onSurface,
                }}
              >
                {member.username.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
        ))}
      </View>
    </RNHostView>
  );

  if (Platform.OS === 'android') {
    return (
      <AssistChip
        onClick={onPress}
        modifiers={[semantics({ contentDescription: label })]}
      >
        <AssistChip.Label>{avatars}</AssistChip.Label>
      </AssistChip>
    );
  }

  return (
    <Button
      variant="outlined"
      onPress={onPress}
      modifiers={
        Platform.OS === 'ios'
          ? [
              buttonBorderShape('capsule'),
              accessibilityElement('ignore'),
              accessibilityLabel(label),
            ]
          : undefined
      }
    >
      {avatars}
    </Button>
  );
}
