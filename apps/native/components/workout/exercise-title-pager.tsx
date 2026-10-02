import { Column, Text } from '@expo/ui';

export type TitlePage = { key: string; name: string; status: string };

export type ExerciseTitlePagerProps = {
  pages: readonly TitlePage[];
  selectedIndex: number;
  /** Swiping the title left or right moves to the next or previous Exercise. */
  onSelect: (index: number) => void;
};

/** Without a native pager (web, tests) the title shows the selected Exercise. */
export function ExerciseTitlePager({
  pages,
  selectedIndex,
}: Readonly<ExerciseTitlePagerProps>) {
  const page = pages[selectedIndex];
  if (!page) return null;
  return (
    <Column spacing={2}>
      <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>{page.name}</Text>
      <Text textStyle={{ fontSize: 15 }}>{page.status}</Text>
    </Column>
  );
}
