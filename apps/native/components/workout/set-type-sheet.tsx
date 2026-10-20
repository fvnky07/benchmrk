import { BottomSheet, Column } from '@expo/ui';

import { Card, CardRow } from '@/components/native/card';
import { SectionHeader } from '@/components/native/section-header';
import { space } from '@/lib/ui';
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
      <Column
        spacing={space.md}
        style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
      >
        <SectionHeader title="Set type" />
        <Card divided>
          {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((type) => (
            <CardRow
              key={type}
              supportingText={SET_TYPE_HINTS[type]}
              onPress={() => onPick(type)}
            >
              {current === type
                ? `${SET_TYPE_LABELS[type]} ✓`
                : SET_TYPE_LABELS[type]}
            </CardRow>
          ))}
        </Card>
      </Column>
    </BottomSheet>
  );
}
