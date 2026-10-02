import { BottomSheet, Column, ListItem, Text } from '@expo/ui';

import { SET_TYPE_LABELS, type SetType } from '@/lib/workout/set-entry';

const SET_TYPE_HINTS: Record<SetType, string> = {
  normal: 'Working Set',
  failure: 'Working Set, taken to failure',
  warmup: 'Not a Working Set; never counts toward progress',
  dropset: 'Not a Working Set',
};

type SetTypeSheetProps = {
  current: SetType | null;
  onPick: (type: SetType) => void;
  onDismiss: () => void;
};

export function SetTypeSheet({
  current,
  onPick,
  onDismiss,
}: Readonly<SetTypeSheetProps>) {
  return (
    <BottomSheet
      isPresented={current !== null}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half']}
    >
      <Column spacing={8} style={{ padding: 16 }}>
        <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Set type</Text>
        {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((type) => (
          <ListItem
            key={type}
            supportingText={SET_TYPE_HINTS[type]}
            trailing={current === type ? <Text>✓</Text> : undefined}
            onPress={() => onPick(type)}
          >
            {SET_TYPE_LABELS[type]}
          </ListItem>
        ))}
      </Column>
    </BottomSheet>
  );
}
