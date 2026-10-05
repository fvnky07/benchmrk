import { AntDesign } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  BaseToast,
  type ToastConfig,
  type ToastConfigParams,
} from 'react-native-toast-message';

import { useColors } from './colors';

type ToastLook = {
  icon: ComponentProps<typeof AntDesign>['name'];
  /** The role that colours the icon and the leading edge on the inverse surface. */
  tone: 'primary' | 'error' | 'secondary';
  radius: number;
  iconTop: number;
};

const LOOKS = {
  success: { icon: 'check-circle', tone: 'primary', radius: 24, iconTop: 0 },
  error: { icon: 'close-circle', tone: 'error', radius: 24, iconTop: 15 },
  info: { icon: 'info-circle', tone: 'secondary', radius: 8, iconTop: 0 },
} as const satisfies Record<string, ToastLook>;

type AppToastProps = Pick<
  ToastConfigParams<unknown>,
  'text1' | 'text2' | 'onPress'
> & { kind: keyof typeof LOOKS };

/** A component, not a render callback, so `useColors` is a legal hook call. */
function AppToast({ kind, text1, text2, onPress }: Readonly<AppToastProps>) {
  const colors = useColors();
  const { icon, tone, radius, iconTop } = LOOKS[kind];

  return (
    <BaseToast
      text1={text1}
      text2={text2}
      onPress={onPress}
      style={{
        borderLeftColor: colors[tone],
        backgroundColor: colors.inverseSurface,
        borderLeftWidth: 5,
        borderRadius: radius,
        height: 60,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: colors.inverseOnSurface,
      }}
      text2Style={{
        fontSize: 13,
        color: colors.inverseOnSurface,
        opacity: 0.8,
      }}
      renderLeadingIcon={() => (
        <AntDesign
          name={icon}
          size={24}
          color={colors[tone]}
          style={{ marginLeft: 15, paddingTop: iconTop }}
        />
      )}
    />
  );
}

export const toastConfig: ToastConfig = {
  success: (props) => <AppToast kind="success" {...props} />,
  error: (props) => <AppToast kind="error" {...props} />,
  info: (props) => <AppToast kind="info" {...props} />,
};
