FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/validator ./packages/validator

ENV CI=true
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @webhook-proxy/shared build
RUN pnpm --filter @webhook-proxy/validator build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app /app

WORKDIR /app/packages/validator

EXPOSE 3000

CMD ["node", "dist/index.js"]
