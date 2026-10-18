import { Column, Text } from '@expo/ui';

import { textColor, useColors } from '@/lib/ui';

export type TitlePage = { key: string; name: string; status: string };

export type ExerciseTitlePagerProps = {
  pages: readonly TitlePage[];
  selectedIndex: number;
  /** Swiping the title left or right moves to the next or previous Exercise. */
  onSelect: (index: number) => void;
};

/**
 * Without a native pager (web, tests) the title shows the selected Exercise:
 * its name, big and bold, over "Set n of m".
 */
export function ExerciseTitlePager({
  pages,
  selectedIndex,
}: Readonly<ExerciseTitlePagerProps>) {
  const colors = useColors();
  const page = pages[selectedIndex];
  if (!page) return null;
  return (
    <Column spacing={2}>
      <Text
        textStyle={{
          fontSize: 28,
          fontWeight: '800',
          color: textColor(colors.onSurface),
        }}
      >
        {page.name}
      </Text>
      <Text
        textStyle={{
          fontSize: 15,
          color: textColor(colors.onSurfaceVariant),
        }}
      >
        {page.status}
      </Text>
    </Column>
  );
}
