-- CreateTable
CREATE TABLE IF NOT EXISTS "_RaceToSourceRaces" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RaceToSourceRaces_A_fkey" FOREIGN KEY ("A") REFERENCES "races" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RaceToSourceRaces_B_fkey" FOREIGN KEY ("B") REFERENCES "races" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "email" TEXT,
    "isIncumbent" BOOLEAN NOT NULL DEFAULT false,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "profileImageId" TEXT,
    "historicalLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidates_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "candidates_historicalLinkId_fkey" FOREIGN KEY ("historicalLinkId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_candidates" ("birthYear", "createdAt", "deletedAt", "email", "firstName", "historicalLinkId", "id", "isIncumbent", "lastName", "middleName", "partyAffiliation", "profileImageId", "raceId", "slug", "updatedAt") SELECT "birthYear", "createdAt", "deletedAt", "email", "firstName", "historicalLinkId", "id", "isIncumbent", "lastName", "middleName", "partyAffiliation", "profileImageId", "raceId", "slug", "updatedAt" FROM "candidates";
DROP TABLE "candidates";
ALTER TABLE "new_candidates" RENAME TO "candidates";
CREATE UNIQUE INDEX "candidates_raceId_slug_key" ON "candidates"("raceId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_RaceToSourceRaces_AB_unique" ON "_RaceToSourceRaces"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_RaceToSourceRaces_B_index" ON "_RaceToSourceRaces"("B");
