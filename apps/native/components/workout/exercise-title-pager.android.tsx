import {
  Column,
  HorizontalPager,
  type HorizontalPagerHandle,
  Text,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef } from 'react';

import { textColor, useColors } from '@/lib/ui';
import type { ExerciseTitlePagerProps } from './exercise-title-pager';

/**
 * Compose HorizontalPager of Exercise titles, each a big bold name over
 * "Set n of m"; it stops at the first and last.
 */
export function ExerciseTitlePager({
  pages,
  selectedIndex,
  onSelect,
}: Readonly<ExerciseTitlePagerProps>) {
  const colors = useColors();
  const pager = useRef<HorizontalPagerHandle>(null);
  // The pager opens on `initialPage`; scroll only when the selection changes
  // later. Compose binds the scroll handle during its first composition, which
  // runs after this component's mount effect.
  const shownIndex = useRef(selectedIndex);

  useEffect(() => {
    if (shownIndex.current === selectedIndex) return;
    shownIndex.current = selectedIndex;
    void pager.current?.animateScrollToPage(selectedIndex);
  }, [selectedIndex]);

  return (
    <HorizontalPager
      ref={pager}
      initialPage={selectedIndex}
      onSettledPageChange={(page) => {
        if (page !== selectedIndex) onSelect(page);
      }}
      modifiers={[fillMaxWidth()]}
    >
      {pages.map((page) => (
        <Column
          key={page.key}
          verticalArrangement={{ spacedBy: 2 }}
          modifiers={[fillMaxWidth()]}
        >
          <Text
            style={{ fontSize: 28, fontWeight: '800' }}
            color={textColor(colors.onSurface)}
          >
            {page.name}
          </Text>
          <Text
            style={{ fontSize: 15 }}
            color={textColor(colors.onSurfaceVariant)}
          >
            {page.status}
          </Text>
        </Column>
      ))}
    </HorizontalPager>
  );
}
