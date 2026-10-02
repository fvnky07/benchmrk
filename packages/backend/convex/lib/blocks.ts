import type { QueryCtx } from '../_generated/server';

/** Blocking is private, but its safety rules apply in both directions. */
export async function blockedEitherWay(
  ctx: QueryCtx,
  a: string,
  b: string
): Promise<boolean> {
  const [forward, reverse] = await Promise.all([
    ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', a).eq('blockedId', b))
      .first(),
    ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', b).eq('blockedId', a))
      .first(),
  ]);
  return forward !== null || reverse !== null;
}

export async function blockedEitherWayIds(
  ctx: QueryCtx,
  userId: string
): Promise<Set<string>> {
  const [outgoing, incoming] = await Promise.all([
    ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect(),
    ctx.db
      .query('blocks')
      .withIndex('by_blocked', (q) => q.eq('blockedId', userId))
      .collect(),
  ]);
  const ids = new Set<string>();
  for (const block of outgoing) ids.add(block.blockedId);
  for (const block of incoming) ids.add(block.blockerId);
  return ids;
}
