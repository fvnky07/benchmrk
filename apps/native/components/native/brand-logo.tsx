import { Image } from 'expo-image';

/** The benchmrk app icon tile, the same artwork as the launcher icon and splash. */
export function BrandLogo({ size }: Readonly<{ size: number }>) {
  return (
    <Image
      accessible
      accessibilityLabel="benchmrk"
      source={require('../../assets/images/logo.png')}
      style={{ width: size, height: size }}
    />
  );
}
