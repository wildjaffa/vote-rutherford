-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('EARLY_VOTING', 'DAY_OF_VOTING');

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SiteType" NOT NULL,
    "voterAddressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "volunteerDates" TIMESTAMP(3)[],
    "startAddress" TEXT NOT NULL,
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "endAddress" TEXT NOT NULL,
    "endLatitude" DOUBLE PRECISION NOT NULL,
    "endLongitude" DOUBLE PRECISION NOT NULL,
    "maxDistance" DOUBLE PRECISION,
    "maxTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_voterAddressId_fkey" FOREIGN KEY ("voterAddressId") REFERENCES "voter_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
