CREATE TYPE "SearchAnalyticsProvider" AS ENUM ('GOOGLE_SEARCH_CONSOLE', 'BING_WEBMASTER');

CREATE TABLE "search_analytics_connections" (
    "id" TEXT NOT NULL,
    "provider" "SearchAnalyticsProvider" NOT NULL,
    "siteUrl" TEXT,
    "accountLabel" TEXT,
    "encryptedCredentials" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_analytics_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "search_analytics_daily_metrics" (
    "id" TEXT NOT NULL,
    "provider" "SearchAnalyticsProvider" NOT NULL,
    "date" DATE NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "averagePosition" DOUBLE PRECISION,
    "connectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_analytics_daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "search_analytics_connections_provider_key" ON "search_analytics_connections"("provider");
CREATE UNIQUE INDEX "search_analytics_daily_metrics_provider_date_key" ON "search_analytics_daily_metrics"("provider", "date");
CREATE INDEX "search_analytics_daily_metrics_date_idx" ON "search_analytics_daily_metrics"("date");

ALTER TABLE "search_analytics_daily_metrics" ADD CONSTRAINT "search_analytics_daily_metrics_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "search_analytics_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;