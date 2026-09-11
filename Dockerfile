FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone Next.js server output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema/migrations, plus the full node_modules (the standalone output only
# traces files needed by the Next.js server, not the `prisma` CLI used by the
# entrypoint to run migrations on boot).
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
