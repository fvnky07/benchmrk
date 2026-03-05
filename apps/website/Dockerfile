FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- builder stage ----
FROM base AS builder
WORKDIR /app

COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/eslint-config ./packages/eslint-config
COPY packages/backend ./packages/backend
COPY apps/website ./apps/website

# onlyBuiltDependencies in root package.json allows esbuild/sharp to build
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/website
RUN pnpm fumadocs-mdx && pnpm next build

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
