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

# 전체 node_modules를 사용한다: standalone이 trace한 최소 node_modules만으로는
# `prisma` CLI(내부적으로 @prisma/engines, @prisma/fetch-engine 등 다수의 @prisma/*
# 패키지에 의존)와 seed 실행용 `tsx`를 감당하지 못해 컨테이너 기동 시
# "Cannot find module '@prisma/engines'" 로 깨진다. 이미지가 다소 커지는 대신
# migrate deploy/seed까지 동일 이미지에서 안정적으로 동작하는 쪽을 택했다.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# next.js standalone 서버 엔트리 + 정적 자산
COPY --from=builder /app/.next/standalone/server.js ./server.js
COPY --from=builder /app/.next/standalone/.next ./.next
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 시작 시 prisma migrate deploy / seed(tsx) 실행을 위한 소스
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
