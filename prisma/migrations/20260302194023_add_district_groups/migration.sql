-- CreateTable
CREATE TABLE "district_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "district_groups_to_districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtGroupId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "district_groups_to_districts_districtGroupId_fkey" FOREIGN KEY ("districtGroupId") REFERENCES "district_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "district_groups_to_districts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_voter_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "city" TEXT,
    "zip" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "districtGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "voter_addresses_districtGroupId_fkey" FOREIGN KEY ("districtGroupId") REFERENCES "district_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_voter_addresses" ("address", "city", "createdAt", "deletedAt", "id", "latitude", "longitude", "normalizedAddress", "updatedAt", "zip") SELECT "address", "city", "createdAt", "deletedAt", "id", "latitude", "longitude", "normalizedAddress", "updatedAt", "zip" FROM "voter_addresses";
DROP TABLE "voter_addresses";
ALTER TABLE "new_voter_addresses" RENAME TO "voter_addresses";
CREATE INDEX "voter_addresses_normalizedAddress_idx" ON "voter_addresses"("normalizedAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "district_groups_hash_key" ON "district_groups"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "district_groups_to_districts_districtGroupId_districtId_key" ON "district_groups_to_districts"("districtGroupId", "districtId");
