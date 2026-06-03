# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json

RUN pnpm install --frozen-lockfile --filter api... --filter worker... --ignore-scripts

COPY apps/api/prisma apps/api/prisma
COPY apps/worker apps/worker

RUN pnpm --dir apps/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --dir apps/worker build

ENV NODE_ENV=production

WORKDIR /app/apps/worker

CMD ["node", "dist/main"]
