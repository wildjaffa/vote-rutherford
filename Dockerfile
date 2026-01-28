# Production Dockerfile for Astro hybrid rendering
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Build the application
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Astro application
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro

# Copy dependencies
COPY --from=deps --chown=astro:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=astro:nodejs /app/package*.json ./

# Copy Prisma schema for migrations
COPY --chown=astro:nodejs prisma ./prisma

USER astro

EXPOSE 4321

# Start the server
CMD ["node", "./dist/server/entry.mjs"]
