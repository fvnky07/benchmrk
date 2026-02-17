import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import {
  Button as SwiftButton,
  Host,
  HStack,
  Label,
  List,
  Section,
  Spacer,
  Text as SwiftText,
  VStack,
} from '@expo/ui/swift-ui';
import { foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { authClient } from '@/lib/auth';

export default function ManageAccountScreen() {
  const { user } = useUserProfile();

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('manage_account');
    }, [])
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              analytics.accountDeleted();
              // TODO: call backend deletion mutation
              await authClient.signOut();
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="bg-black flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-400">Loading account…</Text>
      </View>
    );
  }

  return (
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        {/* Account Information */}
        <Section title="ACCOUNT INFORMATION">
          <HStack spacing={0} modifiers={[padding({ vertical: 8 })]}>
            <SwiftText weight="semibold">Email</SwiftText>
            <Spacer />
            <SwiftText
              modifiers={[
                foregroundStyle({
                  type: 'hierarchical',
                  style: 'secondary',
                }),
              ]}
            >
              {user.email ?? 'Not set'}
            </SwiftText>
          </HStack>

          <HStack spacing={0} modifiers={[padding({ vertical: 8 })]}>
            <SwiftText weight="semibold">Name</SwiftText>
            <Spacer />
            <SwiftText
              modifiers={[
                foregroundStyle({
                  type: 'hierarchical',
                  style: 'secondary',
                }),
              ]}
            >
              {user.name ?? 'Not set'}
            </SwiftText>
          </HStack>
        </Section>

        {/* Actions */}
        <Section title="ACTIONS">
          <HStack spacing={0} modifiers={[padding({ vertical: 8 })]}>
            <Label
              title="Change Password"
              systemImage="lock.fill"
              color="#FF9500"
            />
            <Spacer />
            <SwiftText
              modifiers={[
                foregroundStyle({
                  type: 'hierarchical',
                  style: 'secondary',
                }),
              ]}
            >
              Coming soon
            </SwiftText>
          </HStack>
        </Section>

        {/* Danger Zone */}
        <Section title="DANGER ZONE">
          <VStack spacing={0} alignment="center">
            <SwiftButton
              role="destructive"
              variant="plain"
              onPress={handleDeleteAccount}
            >
              Delete Account
            </SwiftButton>
          </VStack>
        </Section>
      </List>
    </Host>
  );
}
