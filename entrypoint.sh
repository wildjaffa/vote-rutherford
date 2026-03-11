#!/bin/sh
# Run the application in cluster mode with PM2 for production-grade management

# Apply any pending migrations
npx prisma migrate deploy

npx pm2-runtime start ecosystem.config.cjs
