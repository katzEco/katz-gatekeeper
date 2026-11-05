# ponytail: lean alpine bun image, zero build bloat
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Install production dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy application source
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
