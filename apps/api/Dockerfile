# syntax=docker/dockerfile:1
# ---- Stage 1: install and build -------------------------------------------
FROM node:20.11-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci

COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run build --workspace=@ewp/contracts \
 && npm run build --workspace=@ewp/api

# ---- Stage 2: production dependencies only --------------------------------
FROM node:20.11-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev

# ---- Stage 3: runtime -----------------------------------------------------
FROM node:20.11-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
