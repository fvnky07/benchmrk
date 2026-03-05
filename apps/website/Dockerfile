FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- deps stage ----
FROM base AS deps
WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/website/package.json ./apps/website/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build stage ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/website/node_modules ./apps/website/node_modules

COPY packages/eslint-config ./packages/eslint-config
COPY apps/website ./apps/website
COPY package.json pnpm-workspace.yaml turbo.json ./

RUN pnpm turbo run build --filter=website

# ---- runner stage ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/website/public ./apps/website/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/static ./apps/website/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/website/server.js"]
