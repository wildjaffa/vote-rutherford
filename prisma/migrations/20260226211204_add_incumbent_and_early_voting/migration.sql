-- AlterTable
ALTER TABLE "elections" ADD COLUMN "earlyVotingEnd" DATETIME;
ALTER TABLE "elections" ADD COLUMN "earlyVotingStart" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "birthYear" INTEGER,
    "partyAffiliation" TEXT,
    "isIncumbent" BOOLEAN NOT NULL DEFAULT false,
    "profileImageId" TEXT,
    "historicalLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidates_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "candidates_historicalLinkId_fkey" FOREIGN KEY ("historicalLinkId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_candidates" ("birthYear", "createdAt", "deletedAt", "firstName", "historicalLinkId", "id", "lastName", "middleName", "partyAffiliation", "profileImageId", "raceId", "slug", "updatedAt") SELECT "birthYear", "createdAt", "deletedAt", "firstName", "historicalLinkId", "id", "lastName", "middleName", "partyAffiliation", "profileImageId", "raceId", "slug", "updatedAt" FROM "candidates";
DROP TABLE "candidates";
ALTER TABLE "new_candidates" RENAME TO "candidates";
CREATE UNIQUE INDEX "candidates_raceId_slug_key" ON "candidates"("raceId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
