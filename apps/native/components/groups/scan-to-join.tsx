import QrCodeScannerIcon from '@expo/material-symbols/qr_code_scanner.xml';
import { Column, Icon } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { Card, CardRow } from '@/components/native/card';
import { joinCodeFrom } from '@/lib/groups/join-code';
import { space, useColors } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  CODE_INVALID:
    'That code isn’t valid. It may have expired or the Group ended.',
  IN_ANOTHER_GROUP: 'You’re already in a Group. Leave it first.',
  GROUP_FULL: 'This Group is full: Groups hold up to 20 members.',
  EMAIL_NOT_VERIFIED: 'Verify your email to create or join Groups.',
};

const SCAN_ACCESSIBILITY = [accessibilityModifier('Scan a Group QR code')];
const SCAN_ICON = {
  ios: 'qrcode.viewfinder',
  android: QrCodeScannerIcon,
} as const;

export function ScanToJoin() {
  const colors = useColors();
  const joinByCode = useMutation(api.groups.joinByCode);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const subscription = useRef<{ remove(): void } | null>(null);
  const processing = useRef(false);
  const mounted = useRef(true);
  const available = CameraView.isModernBarcodeScannerAvailable;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, []);

  const scan = async () => {
    if (processing.current || !available) return;
    processing.current = true;
    setBusy(true);
    setErrorMessage(null);
    setNeedsVerification(false);
    subscription.current?.remove();
    subscription.current = null;
    let received = false;
    let launched = false;

    const joinScanned = async (data: string) => {
      try {
        if (Platform.OS === 'ios') await CameraView.dismissScanner();
        if (!mounted.current) return;
        const code = joinCodeFrom(data);
        if (code === null) {
          setErrorMessage('That QR isn’t a benchmrk Group code.');
          return;
        }
        await joinByCode({ code });
      } catch (error: unknown) {
        if (!mounted.current) return;
        const code = errorCode(error) ?? '';
        setNeedsVerification(code === 'EMAIL_NOT_VERIFIED');
        setErrorMessage(
          ERROR_COPY[code] ?? 'Couldn’t join this Group. Try again.'
        );
      } finally {
        processing.current = false;
        if (mounted.current) setBusy(false);
      }
    };

    try {
      // VisionKit requires camera access; Google's system scanner does not.
      if (Platform.OS === 'ios' && !permission?.granted) {
        const granted = await requestPermission();
        if (!mounted.current) return;
        if (!granted.granted) {
          setErrorMessage(
            'Allow camera access to scan a Group QR code, or enter the code instead.'
          );
          return;
        }
      }
      if (!mounted.current) return;
      subscription.current = CameraView.onModernBarcodeScanned(({ data }) => {
        if (received || !mounted.current) return;
        received = true;
        subscription.current?.remove();
        subscription.current = null;
        processing.current = true;
        setBusy(true);
        void joinScanned(data);
      });
      await CameraView.launchScanner({ barcodeTypes: ['qr'] });
      launched = true;
    } catch (error: unknown) {
      if (mounted.current && !received) {
        const cancelled =
          error instanceof Error &&
          'code' in error &&
          error.code === 'ERR_BARCODE_SCANNING_CANCELLED';
        if (!cancelled) {
          setErrorMessage('Couldn’t open the scanner. Enter the code instead.');
        }
      }
    } finally {
      if (!received) {
        // iOS resolves on presentation, not dismissal. Keep its listener until
        // a result, a subsequent launch, or unmount; the button can scan again
        // after the system sheet is cancelled.
        if (!launched || Platform.OS !== 'ios') {
          subscription.current?.remove();
          subscription.current = null;
        }
        processing.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  };

  return (
    <Column spacing={space.lg}>
      <Card divided>
        <CardRow
          chevron={available && !busy}
          leading={
            <Icon name={SCAN_ICON} size={24} color={colors.onSurfaceVariant} />
          }
          modifiers={SCAN_ACCESSIBILITY}
          supportingText={
            available
              ? undefined
              : 'Scanning isn’t available on this device. Enter the code instead.'
          }
          onPress={busy || !available ? undefined : () => void scan()}
        >
          Scan QR
        </CardRow>
        {errorMessage ? (
          <CardRow supportingText={errorMessage}>
            Couldn’t join this Group
          </CardRow>
        ) : null}
      </Card>
      {needsVerification ? (
        <Card>
          <EmailVerificationRow />
        </Card>
      ) : null}
    </Column>
  );
}
