import {
  HStack,
  ScrollView,
  Text,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  containerRelativeFrame,
  font,
  foregroundStyle,
  id,
  scrollPosition,
  scrollTargetBehavior,
  scrollTargetLayout,
} from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';

import { useColors } from '@/lib/ui';
import type { ExerciseTitlePagerProps } from './exercise-title-pager';

/**
 * A paging ScrollView of Exercise titles, each a big bold name over
 * "Set n of m"; it stops at the first and last.
 */
export function ExerciseTitlePager({
  pages,
  selectedIndex,
  onSelect,
}: Readonly<ExerciseTitlePagerProps>) {
  const colors = useColors();
  const selectedKey = pages[selectedIndex]?.key ?? null;
  const position = useNativeState<string | null>(selectedKey);

  useEffect(() => {
    if (position.value !== selectedKey) position.value = selectedKey;
  }, [position, selectedKey]);

  return (
    <ScrollView
      axes="horizontal"
      showsIndicators={false}
      modifiers={[
        scrollTargetBehavior('paging'),
        scrollPosition(position, {
          onChange: (key) => {
            const index = pages.findIndex((page) => page.key === key);
            if (index !== -1 && index !== selectedIndex) onSelect(index);
          },
        }),
      ]}
    >
      <HStack spacing={0} modifiers={[scrollTargetLayout()]}>
        {pages.map((page) => (
          <VStack
            key={page.key}
            alignment="leading"
            spacing={2}
            modifiers={[
              containerRelativeFrame({
                axes: 'horizontal',
                alignment: 'leading',
              }),
              id(page.key),
            ]}
          >
            <Text
              modifiers={[
                font({ size: 28, weight: 'heavy' }),
                foregroundStyle(colors.onSurface),
              ]}
            >
              {page.name}
            </Text>
            <Text
              modifiers={[
                font({ size: 15 }),
                foregroundStyle(colors.onSurfaceVariant),
              ]}
            >
              {page.status}
            </Text>
          </VStack>
        ))}
      </HStack>
    </ScrollView>
  );
}
