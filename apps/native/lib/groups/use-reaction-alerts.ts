import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { showToast } from '@/lib/ui/toast';

export function useReactionAlerts() {
  const reactions = useQuery(api.reactions.mine, {});
  const settings = useQuery(api.memberSettings.get);
  const initialNewestAt = useRef<number | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (reactions === undefined) return;
    if (initialNewestAt.current === null) {
      initialNewestAt.current = reactions.received.reduce(
        (newest, reaction) => Math.max(newest, reaction.at),
        0
      );
      for (const reaction of reactions.received) {
        seen.current.add(reaction.reactionId);
      }
      return;
    }

    const newer = reactions.received
      .filter(
        (reaction) =>
          reaction.at > (initialNewestAt.current ?? 0) &&
          !seen.current.has(reaction.reactionId)
      )
      .sort((a, b) => a.at - b.at);
    for (const reaction of newer) {
      seen.current.add(reaction.reactionId);
      const target =
        reaction.eventKind === 'setCompleted' ? 'your Set' : 'your targets';
      showToast.info(`${reaction.fromUsername} fist-bumped ${target}`);
      if (settings?.haptics === true) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [reactions, settings?.haptics]);
}
