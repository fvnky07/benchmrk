import { Column, Host, ScrollView } from '@expo/ui';
import type { ReactNode } from 'react';

import { useAppearance } from '@/lib/ui';

export function NativeScreen({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { resolvedAppearance } = useAppearance();

  return (
    <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
      <ScrollView showsIndicators>
        <Column spacing={16} style={{ padding: 24 }}>
          {children}
        </Column>
      </ScrollView>
    </Host>
  );
}
