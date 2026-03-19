# Stage 1: Base setup for all stages
FROM node:22-slim AS base
WORKDIR /app
# Install runtime dependencies for Prisma and other native modules
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies - Install ALL dependencies for building
FROM base AS deps
COPY package*.json ./
# We need devDeps for building
RUN npm ci

# Stage 3: Builder - Build the application
FROM deps AS builder
# DATABASE_URL is required by Prisma at generate/build time.
ARG DATABASE_URL=file:/tmp/build-placeholder.db
ARG CONTACT_EMAIL
ARG PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY
ENV DATABASE_URL=${DATABASE_URL}
ENV CONTACT_EMAIL=${CONTACT_EMAIL}
ENV PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY=${PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY}

COPY . .
# Generate Prisma Client (output is src/generated/prisma as per schema)
RUN npx prisma generate
RUN npm run build

# Stage 4: Production dependencies - Isolated production node_modules
FROM base AS production-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 5: Runner - Final production image
FROM base AS runner
ENV NODE_ENV=production

# Copy production node_modules
COPY --from=production-deps /app/node_modules ./node_modules

# Copy build artifacts
COPY --from=builder /app/dist ./dist
# Copy generated Prisma Client
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copy necessary runtime files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Expose SSR port
EXPOSE 4321

# Start SSR server via entrypoint.sh (which uses PM2)
CMD ["./entrypoint.sh"]
