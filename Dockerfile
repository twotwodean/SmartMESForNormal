# syntax=docker/dockerfile:1

# ── deps: install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: generate prisma client + build next standalone ──
FROM node:20-alpine AS builder
WORKDIR /app
# Alpine 기본 이미지엔 OpenSSL이 없어 Prisma 쿼리 엔진(linux-musl)이 libssl을 못 찾는다.
# 이걸 빠뜨리면 엔진이 openssl-1.1.x로 잘못 폴백되어 런타임에 DB 쿼리가 깨진다.
RUN apk add --no-cache openssl
# prisma generate/next build 시점에만 필요한 더미 값 (실제 접속은 하지 않음)
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── runner: minimal production runtime ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# 헬스체크용 wget + Prisma 쿼리 엔진(linux-musl)이 필요로 하는 OpenSSL
RUN apk add --no-cache wget openssl

# WORKDIR 소유권만 nextjs로 넘긴다. 이후 설치/복사를 nextjs로 수행해
# node_modules 전체를 `chown -R`로 다시 복제하는 레이어(수백 MB 낭비)를 없앤다.
RUN chown nextjs:nodejs /app
USER nextjs

# 프로덕션 전용 설치: Storybook/Playwright/Vitest 등 devDependencies를 배제한다.
# prisma(CLI)와 tsx(seed 실행)는 package.json에서 dependencies로 옮겨졌으므로
# --omit=dev 로도 함께 설치된다. 설치 캐시는 이미지에 남기지 않는다.
COPY --chown=nextjs:nodejs --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# `npx prisma generate`가 스키마를 읽어 .prisma/client 엔진을 node_modules에 생성한다.
# generate 시점에도 datasource url env가 정의돼 있어야 하므로 더미 값을 준다 (실제 접속 없음).
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=${DATABASE_URL}
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
RUN npx prisma generate

# next.js standalone 서버 엔트리 + 정적 자산
# (standalone이 자체 trace한 node_modules는 사용하지 않는다 — 위에서 만든
# --omit=dev node_modules를 그대로 쓰고, server.js/.next/public만 가져온다.)
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone/server.js ./server.js
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# 시작 시 prisma migrate deploy / seed(tsx) 실행을 위한 소스
COPY --chown=nextjs:nodejs --from=builder /app/lib ./lib

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
