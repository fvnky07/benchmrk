// PROTOTYPE — throwaway. Lives only on the prototype/workout-ui branch.
// Switches between UI variants of a route via the `?variant=` search param.
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type PrototypeVariant = Readonly<{ key: string; name: string }>;

/** The active variant key from `?variant=`, defaulting to the first. */
export function useVariant(variants: readonly PrototypeVariant[]): string {
  const { variant } = useLocalSearchParams<{ variant?: string }>();
  return variants.some((v) => v.key === variant)
    ? (variant as string)
    : variants[0].key;
}

/** Renders the route plus a floating bar that cycles `?variant=`. */
export function PrototypeVariants({
  variants,
  children,
}: Readonly<{ variants: readonly PrototypeVariant[]; children: ReactNode }>) {
  const current = useVariant(variants);
  const insets = useSafeAreaInsets();
  if (!__DEV__) {
    return children;
  }
  const index = variants.findIndex((v) => v.key === current);
  const go = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length];
    router.setParams({ variant: next.key });
  };
  const label = `${variants[index].key} · ${variants[index].name}`;

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: insets.top + 4,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FF2D95',
            borderRadius: 999,
            paddingHorizontal: 4,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Pressable
            accessibilityLabel="Previous variant"
            onPress={() => go(-1)}
            style={{ padding: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>◀</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            {label}
          </Text>
          <Pressable
            accessibilityLabel="Next variant"
            onPress={() => go(1)}
            style={{ padding: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>▶</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
