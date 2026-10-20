import { Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { ErrorBoundaryProps } from 'expo-router';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Card } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { SectionHeader } from '@/components/native/section-header';
import { StatRow, type StatTileProps } from '@/components/native/stat-tile';
import { groupEventText } from '@/lib/groups/event-text';
import {
  accessibilityModifier,
  font,
  space,
  textColor,
  useColors,
} from '@/lib/ui';
import { errorCode, weightInUnit } from '@/lib/workout/format';
import { formatMinutes } from '@/lib/workout/time';

const ERROR_COPY: Record<string, string> = {
  NOT_FOUND: 'This recap isn’t available.',
};

/** Two tiles per row: a 28pt duration like "1 h 5 min" doesn't fit a third. */
function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const colors = useColors();
  const code = errorCode(error) ?? '';
  return (
    <NativeScreen>
      <Text textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}>
        {ERROR_COPY[code] ?? 'Something went wrong. Try again.'}
      </Text>
      <Button label="Back" onPress={() => router.back()} />
    </NativeScreen>
  );
}

export default function GroupRecapScreen() {
  const { groupId: rawGroupId } = useLocalSearchParams<{ groupId: string }>();
  const groupId = rawGroupId as Id<'groups'>;
  const colors = useColors();
  const recap = useQuery(api.recaps.get, { groupId });
  const settings = useQuery(api.memberSettings.get);
  const hide = useMutation(api.recaps.hide);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };

  if (recap === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading Group recap…
        </Text>
      </NativeScreen>
    );
  }

  const units = settings?.units ?? 'kg';
  const ownUsername = recap.rows.find((row) => row.isYou)?.username;
  const timelineText = recap.timeline.map((event) =>
    groupEventText({
      ...event,
      isYou: event.username !== null && event.username === ownUsername,
    })
  );

  return (
    <NativeScreen>
      <Text textStyle={caption}>
        {new Date(recap.endedAt).toLocaleString()}
      </Text>
      {recap.rows.map((row) => {
        const tiles: StatTileProps[] = [
          { label: 'Sets', value: String(row.setsDone) },
          { label: 'Duration', value: formatMinutes(row.durationSeconds) },
          { label: 'Targets met', value: String(row.targetsMet) },
          ...(row.volumeKg !== null
            ? [
                {
                  label: 'Volume',
                  value: String(weightInUnit(row.volumeKg, units)),
                  unit: units,
                },
              ]
            : []),
        ];
        return (
          <Column key={row.username} spacing={space.sm}>
            <SectionHeader
              title={row.isYou ? `${row.username} · You` : row.username}
            />
            {pairs(tiles).map((pair) => (
              <StatRow key={pair[0]?.label} tiles={pair} />
            ))}
          </Column>
        );
      })}
      {timelineText.length > 0 ? (
        <>
          <SectionHeader title="Timeline" />
          <Card padding={space.lg} spacing={6}>
            {timelineText.map((line, index) => (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: Timeline events are immutable and ordered
                key={`${index}:${line}`}
                textStyle={{
                  ...font.caption,
                  color: textColor(colors.onSurface),
                }}
              >
                {line}
              </Text>
            ))}
          </Card>
        </>
      ) : null}
      <Button
        disabled={busy}
        label="Hide from my history"
        variant="text"
        modifiers={[accessibilityModifier('Hide from my history')]}
        onPress={async () => {
          setBusy(true);
          setErrorMessage(null);
          try {
            await hide({ groupId });
            router.back();
          } catch (error) {
            const code = errorCode(error) ?? '';
            setErrorMessage(
              ERROR_COPY[code] ?? 'Something went wrong. Try again.'
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {errorMessage ? (
        <Card tone="high" padding={space.lg} spacing={space.xs}>
          <Text
            textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
          >
            Couldn’t hide recap
          </Text>
          <Text textStyle={{ ...font.caption, color: textColor(colors.error) }}>
            {errorMessage}
          </Text>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
