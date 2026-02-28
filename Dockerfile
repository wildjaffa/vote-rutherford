# Stage 1: Build
FROM node:lts AS builder
WORKDIR /app

# DATABASE_URL is required by Prisma at generate/build time.
# We use a dummy placeholder here; the real value is injected at runtime.
ARG DATABASE_URL=file:/tmp/build-placeholder.db
ARG CONTACT_EMAIL
ENV DATABASE_URL=${DATABASE_URL}
ENV CONTACT_EMAIL=${CONTACT_EMAIL}

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source and build
COPY . .

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build

# Stage 2: Run
FROM node:lts AS runner
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Copy prisma config for migrations
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint script
COPY --from=builder /app/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Expose SSR port
EXPOSE 4321

# Start SSR server
CMD ["./entrypoint.sh"]
