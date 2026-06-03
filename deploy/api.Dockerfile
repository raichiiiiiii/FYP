# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter api... --ignore-scripts

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm build

ENV NODE_ENV=production
ENV API_PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema prisma/schema.prisma && node dist/main"]
