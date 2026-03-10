-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_races" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raceTypeId" INTEGER NOT NULL,
    "districtId" TEXT,
    "numSelections" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "partyCategory" TEXT NOT NULL DEFAULT 'General Election',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "races_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "races_raceTypeId_fkey" FOREIGN KEY ("raceTypeId") REFERENCES "race_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "races_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_races" ("createdAt", "deletedAt", "description", "districtId", "electionId", "id", "name", "numSelections", "partyCategory", "raceTypeId", "shortName", "slug", "status", "updatedAt") SELECT "createdAt", "deletedAt", "description", "districtId", "electionId", "id", "name", "numSelections", "partyCategory", "raceTypeId", "shortName", "slug", "status", "updatedAt" FROM "races";
DROP TABLE "races";
ALTER TABLE "new_races" RENAME TO "races";
CREATE UNIQUE INDEX "races_electionId_slug_key" ON "races"("electionId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
