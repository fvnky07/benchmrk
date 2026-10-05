import { vi } from 'vitest';

import type { TestBackend } from './harness.testing';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/** A badge-only refresh carries just `to` and `badge`. */
export interface PushMessage {
  to: string;
  title?: string;
  body?: string;
  sound?: string;
  channelId?: string;
  badge?: number;
  data?: { type: string; inviteId?: string; kind?: string };
}

interface PushReceipt {
  status: 'ok' | 'error';
  details?: { error: string };
}

/**
 * Stubs only the Expo Push Service; every identity, Group and token function
 * stays real. Records each message sent and each receipt request.
 */
export function pushService({
  invalidTicketToken,
  invalidReceiptToken,
}: {
  invalidTicketToken?: string;
  invalidReceiptToken?: string;
} = {}) {
  const messages: PushMessage[] = [];
  const receiptRequests: string[][] = [];
  const receipts: { [id: string]: PushReceipt } = {};
  let nextReceipt = 0;
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body !== 'string')
        throw new Error('Expected JSON push body');
      if (String(input) === SEND_URL) {
        const batch = JSON.parse(init.body) as PushMessage[];
        messages.push(...batch);
        const data = batch.map((message) => {
          if (message.to === invalidTicketToken) {
            return {
              status: 'error',
              details: { error: 'DeviceNotRegistered' },
            };
          }
          const id = `receipt-${nextReceipt++}`;
          receipts[id] =
            message.to === invalidReceiptToken
              ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
              : { status: 'ok' };
          return { status: 'ok', id };
        });
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      if (String(input) === RECEIPTS_URL) {
        const { ids } = JSON.parse(init.body) as { ids: string[] };
        receiptRequests.push(ids);
        const data = Object.fromEntries(ids.map((id) => [id, receipts[id]]));
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      throw new Error(`Unexpected external request: ${String(input)}`);
    }
  );
  vi.stubGlobal('fetch', fetchMock);
  return { messages, receiptRequests, fetchMock };
}

/** Advances fake time, then runs the scheduled functions now due. */
export async function finishDue(t: TestBackend, milliseconds = 0) {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await t.finishInProgressScheduledFunctions();
}
