import { customMutation } from 'convex-helpers/server/customFunctions';

import { mutation } from '../_generated/server';
import { syncGroupProgress } from './groupProgress';
import { getIdentityId } from './identity';

/**
 * A mutation that changes the caller's active Workout. After it succeeds, the
 * caller's Group progress summary is rewritten in the same transaction, so
 * other members never read Workout rows and never see stale progress.
 */
export const workoutMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => ({
    ctx: {},
    args: {},
    onSuccess: async () => {
      const userId = await getIdentityId(ctx);
      if (userId) await syncGroupProgress(ctx, userId);
    },
  }),
});
