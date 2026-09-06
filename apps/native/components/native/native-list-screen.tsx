import { Host, List } from '@expo/ui';
import type { ReactNode } from 'react';

import { useAppearance } from '@/lib/ui';

export function NativeListScreen({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { resolvedAppearance } = useAppearance();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <List>{children}</List>
    </Host>
  );
}
