import { useCallback } from 'react';

import {
  Host,
  HStack,
  Label,
  List,
  Section,
  Spacer,
  Text as SwiftText,
  VStack,
} from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';

import { useFocusEffect } from 'expo-router';

import { analytics } from '@/lib/analytics';

export default function ExportImportScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('export_import');
    }, [])
  );

  return (
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        <Section title="EXPORT">
          <HStack spacing={12}>
            <Label
              title="Export All Data"
              systemImage="arrow.up.doc.fill"
              color="#007AFF"
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

          <VStack spacing={4}>
            <SwiftText size={13} color="#8E8E93">
              Export your workout history, settings, and profile as a JSON or
              CSV file.
            </SwiftText>
          </VStack>
        </Section>

        <Section title="IMPORT">
          <HStack spacing={12}>
            <Label
              title="Import Data"
              systemImage="arrow.down.doc.fill"
              color="#34C759"
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

          <VStack spacing={4}>
            <SwiftText size={13} color="#8E8E93">
              Restore data from a previous export file.
            </SwiftText>
          </VStack>
        </Section>
      </List>
    </Host>
  );
}
