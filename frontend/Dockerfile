# syntax=docker/dockerfile:1

# ────────────────────────────────────────────────────────────
# Stage 1 – deps: install all dependencies
# node:20-slim (Debian/glibc) is required for @next/swc-linux-arm64-gnu
# ────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ────────────────────────────────────────────────────────────
# Stage 2 – builder: compile Next.js
# ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# .env is copied above (not excluded by .dockerignore) so Next.js reads
# NEXT_PUBLIC_* vars natively during build. Only non-secret public vars live there.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ────────────────────────────────────────────────────────────
# Stage 3 – runner: minimal production image
# ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what's needed for standalone output
COPY --from=builder /app/public ./public

# Standalone build output (next.config.mjs sets output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
