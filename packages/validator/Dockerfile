FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY packages/validator ./packages/validator

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared types
RUN pnpm --filter @webhook-proxy/shared build

# Build validator
RUN pnpm --filter @webhook-proxy/validator build

WORKDIR /app/packages/validator

EXPOSE 3000

CMD ["pnpm", "start"]
