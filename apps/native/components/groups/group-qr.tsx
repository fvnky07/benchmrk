import { Column, RNHostView, Text } from '@expo/ui';
import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const QR_SIZE = 240;
const QUIET_ZONE = 4;

export function GroupQr({ link }: { link: string }) {
  const { size, path } = useMemo(() => {
    const modules = QRCode.create(link, { errorCorrectionLevel: 'M' }).modules;
    const darkModules: string[] = [];
    for (let row = 0; row < modules.size; row += 1) {
      for (let col = 0; col < modules.size; col += 1) {
        if (modules.get(row, col)) {
          darkModules.push(`M${col + QUIET_ZONE},${row + QUIET_ZONE}h1v1h-1z`);
        }
      }
    }
    return {
      size: modules.size + QUIET_ZONE * 2,
      path: darkModules.join(''),
    };
  }, [link]);

  return (
    <Column spacing={12}>
      <RNHostView matchContents>
        <Svg
          accessible
          accessibilityLabel="QR code to join this Group"
          accessibilityRole="image"
          width={QR_SIZE}
          height={QR_SIZE}
          viewBox={`0 0 ${size} ${size}`}
        >
          <Rect width={size} height={size} fill="#FFFFFF" />
          <Path d={path} fill="#000000" />
        </Svg>
      </RNHostView>
      <Text>{link}</Text>
    </Column>
  );
}
