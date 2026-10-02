import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const HEARTBEAT_INTERVAL_MS = 15_000;

/** Keep presence fresh only while a member's Group is open in the foreground. */
export function useGroupHeartbeat() {
  const group = useQuery(api.groups.getMine);
  const heartbeat = useMutation(api.groups.heartbeat);
  const joinedAt = group?.members.find((box) => box.isYou)?.joinedAt;
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (joinedAt === undefined || appState !== 'active') return;
    const sendHeartbeat = () => {
      void heartbeat({}).catch((error: unknown) => {
        console.warn('Group heartbeat could not be sent', error);
      });
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [appState, heartbeat, joinedAt]);
}
