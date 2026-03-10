# Stage 1: Build
FROM node:lts AS builder
WORKDIR /app

# DATABASE_URL is required by Prisma at generate/build time.
# We use a dummy placeholder here; the real value is injected at runtime.
ARG DATABASE_URL=file:/tmp/build-placeholder.db
ARG CONTACT_EMAIL
ARG PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY
ENV DATABASE_URL=${DATABASE_URL}
ENV CONTACT_EMAIL=${CONTACT_EMAIL}
ENV PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY=${PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY}

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

# Copy source code for the email worker
COPY --from=builder /app/src ./src

# Copy prisma config for migrations
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint script and support scripts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/ecosystem.config.cjs ./ecosystem.config.cjs
COPY --from=builder /app/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Expose SSR port
EXPOSE 4321

# Start SSR server
CMD ["./entrypoint.sh"]
