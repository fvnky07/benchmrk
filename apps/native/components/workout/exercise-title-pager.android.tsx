import {
  Column,
  HorizontalPager,
  type HorizontalPagerHandle,
  Text,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { useEffect, useRef } from 'react';

import type { ExerciseTitlePagerProps } from './exercise-title-pager';

/** Compose HorizontalPager of Exercise titles; it stops at the first and last. */
export function ExerciseTitlePager({
  pages,
  selectedIndex,
  onSelect,
}: Readonly<ExerciseTitlePagerProps>) {
  const pager = useRef<HorizontalPagerHandle>(null);

  useEffect(() => {
    void pager.current?.animateScrollToPage(selectedIndex);
  }, [selectedIndex]);

  return (
    <HorizontalPager
      ref={pager}
      initialPage={selectedIndex}
      onSettledPageChange={(page) => {
        if (page !== selectedIndex) onSelect(page);
      }}
      modifiers={[weight(1)]}
    >
      {pages.map((page) => (
        <Column key={page.key} modifiers={[fillMaxWidth()]}>
          <Text style={{ typography: 'titleLarge' }}>{page.name}</Text>
          <Text style={{ typography: 'bodyMedium' }}>{page.status}</Text>
        </Column>
      ))}
    </HorizontalPager>
  );
}
