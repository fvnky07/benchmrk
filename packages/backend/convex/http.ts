import './polyfills';
import { httpRouter } from 'convex/server';
import { authComponent, createAuth } from './betterAuth/auth';

const http = httpRouter();

// NOTE: Register all Better Auth routes
// (magic link verification, token endpoint, etc.)
// biome-ignore lint/suspicious/noExplicitAny: type mismatch between @convex-dev/better-auth 0.10.x and better-auth 1.6.x
authComponent.registerRoutes(http, createAuth as any);

export default http;
