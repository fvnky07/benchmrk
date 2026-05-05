// @ts-nocheck — DOM types (MessageChannel, MessageEvent, Transferable) exist
// in Convex runtime and the backend tsconfig (lib: dom) but not in the native
// tsconfig which sees this file transitively. Suppressing is correct here.

// NOTE: Polyfill for MessageChannel needed by Better Auth in Convex runtime
if (typeof MessageChannel === 'undefined') {
  class MockMessagePort {
    onmessage: ((ev: MessageEvent) => void) | undefined;
    onmessageerror: ((ev: MessageEvent) => void) | undefined;

    close() {}
    postMessage(_message: unknown, _transfer: Transferable[] = []) {}
    start() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent(_event: Event): boolean {
      return false;
    }
  }

  class MockMessageChannel {
    port1: MockMessagePort;
    port2: MockMessagePort;

    constructor() {
      this.port1 = new MockMessagePort();
      this.port2 = new MockMessagePort();
    }
  }

  globalThis.MessageChannel =
    MockMessageChannel as unknown as typeof MessageChannel;
}
