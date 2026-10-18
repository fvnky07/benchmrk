import {
  BottomSheet,
  Button,
  Column,
  Picker,
  Row,
  ScrollView,
  Spacer,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import {
  DEFAULT_PLATES,
  type PlateInventory,
} from '@repo/backend/convex/domain/plates';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { Card } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, tabularDigits, textColor, useColors } from '@/lib/ui';
import { weightInUnit } from '@/lib/workout/format';
import { plateLoad, plateStrip } from '@/lib/workout/plates';

/** Common bars, in each unit. */
const BARS: Record<WeightUnit, readonly number[]> = {
  kg: [20, 15, 10],
  lb: [45, 35, 25, 15],
};

/**
 * Plate colours by size, heaviest first, like most gyms. Intentionally fixed:
 * they match the real plates, so they don't follow the app colour roles.
 */
const PLATE_COLORS = [
  '#c62828',
  '#1565c0',
  '#f9a825',
  '#2e7d32',
  '#eeeeee',
  '#212121',
  '#9e9e9e',
];

type PlatesSheetProps = {
  isPresented: boolean;
  inventory: PlateInventory;
  /** The weight being edited, in kg; null when none. */
  weightKg: number | null;
  /** Called on every edit, so the Workout counts as active. */
  onActivity: () => void;
  onDismiss: () => void;
};

/**
 * The plate breakdown for the weight being edited, with the bar picker, a
 * diagram and the member's plate inventory. Render it with a `key` per
 * opening; the draft starts from the saved inventory.
 */
export function PlatesSheet({
  isPresented,
  inventory,
  weightKg,
  onActivity,
  onDismiss,
}: Readonly<PlatesSheetProps>) {
  const updateSettings = useMutation(api.memberSettings.update);
  const colors = useColors();
  const [draft, setDraft] = useState(inventory);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const weight = weightKg === null ? null : weightInUnit(weightKg, draft.unit);
  const load = weight === null ? null : plateLoad(weight, draft);
  const sizes = [...draft.plates]
    .map((plate) => plate.weight)
    .sort((a, b) => b - a);
  const heaviest = sizes[0] ?? 1;
  const bars = [...new Set([...BARS[draft.unit], draft.barWeight])].sort(
    (a, b) => b - a
  );
  const muted = { ...font.caption, color: textColor(colors.onSurfaceVariant) };
  const editDraft: typeof setDraft = (update) => {
    onActivity();
    setDraft(update);
  };

  const setPairs = (plateWeight: number, pairs: number) =>
    editDraft((current) => ({
      ...current,
      plates: current.plates.map((plate) =>
        plate.weight === plateWeight
          ? { ...plate, pairs: Math.max(0, Math.min(20, pairs)) }
          : plate
      ),
    }));

  const save = async () => {
    onActivity();
    try {
      setErrorMessage(null);
      await updateSettings({ plates: draft });
      onDismiss();
    } catch {
      setErrorMessage('Could not save your plates.');
    }
  };

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half', 'full']}
    >
      <ScrollView>
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
        >
          <SectionHeader title="Plates" />
          <Card padding={space.lg} spacing={space.md}>
            {weight !== null ? (
              <Text
                textStyle={{
                  ...font.bodyStrong,
                  color: textColor(colors.onSurface),
                }}
                modifiers={tabularDigits()}
              >
                {`${weight} ${draft.unit}: ${plateStrip(weight, draft)}`}
              </Text>
            ) : (
              <Text textStyle={muted}>
                Enter a weight for the plate breakdown.
              </Text>
            )}
            {load?.kind === 'loaded' && load.perSide.length > 0 ? (
              <Row spacing={3} alignment="center">
                <Column
                  style={{
                    width: 40,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: colors.onSurfaceVariant,
                  }}
                />
                {load.perSide.map((plate, index) => (
                  <Column
                    // biome-ignore lint/suspicious/noArrayIndexKey: plates repeat by size
                    key={index}
                    style={{
                      width: 12,
                      height: 24 + 56 * (plate / heaviest),
                      borderRadius: 3,
                      borderWidth: 1,
                      borderColor: colors.outlineVariant,
                      backgroundColor:
                        PLATE_COLORS[sizes.indexOf(plate)] ??
                        colors.surfaceContainerHigh,
                    }}
                  />
                ))}
              </Row>
            ) : null}
          </Card>
          <SectionHeader title="Bar" />
          <Picker
            selectedValue={draft.barWeight}
            onValueChange={(value) => {
              if (typeof value === 'number') {
                editDraft((current) => ({ ...current, barWeight: value }));
              }
            }}
          >
            {bars.map((bar) => (
              <Picker.Item
                key={bar}
                label={`${bar} ${draft.unit} bar`}
                value={bar}
              />
            ))}
          </Picker>
          <SectionHeader title="Plates you have (pairs)" />
          <Picker
            selectedValue={draft.unit}
            onValueChange={(value) => {
              if (value === 'kg' || value === 'lb') {
                editDraft(DEFAULT_PLATES[value]);
              }
            }}
          >
            <Picker.Item label="Plates in kilograms" value="kg" />
            <Picker.Item label="Plates in pounds" value="lb" />
          </Picker>
          <Card divided>
            {[...draft.plates]
              .sort((a, b) => b.weight - a.weight)
              .map((plate) => (
                <Row
                  key={plate.weight}
                  spacing={space.sm}
                  alignment="center"
                  style={{
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                  }}
                >
                  <Column spacing={2}>
                    <Text
                      textStyle={{
                        ...font.body,
                        color: textColor(colors.onSurface),
                      }}
                      modifiers={tabularDigits()}
                    >
                      {`${plate.weight} ${draft.unit}`}
                    </Text>
                    <Text textStyle={muted}>
                      {`${plate.pairs} ${plate.pairs === 1 ? 'pair' : 'pairs'}`}
                    </Text>
                  </Column>
                  <Spacer flexible />
                  <PillChip
                    label="−1 pair"
                    disabled={plate.pairs === 0}
                    onPress={() => setPairs(plate.weight, plate.pairs - 1)}
                  />
                  <PillChip
                    label="+1 pair"
                    onPress={() => setPairs(plate.weight, plate.pairs + 1)}
                  />
                </Row>
              ))}
          </Card>
          {errorMessage ? (
            <Text
              textStyle={{ ...font.caption, color: textColor(colors.error) }}
            >
              {errorMessage}
            </Text>
          ) : null}
          <PrimaryButton label="Save plates" onPress={() => void save()} />
          <Button
            label="Reset to defaults"
            variant="text"
            onPress={() => editDraft(DEFAULT_PLATES[draft.unit])}
          />
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
