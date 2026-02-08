-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_races" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raceTypeId" INTEGER NOT NULL,
    "districtId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "races_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "races_raceTypeId_fkey" FOREIGN KEY ("raceTypeId") REFERENCES "race_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "races_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_races" ("createdAt", "deletedAt", "description", "electionId", "id", "name", "raceTypeId", "slug", "status", "updatedAt") SELECT "createdAt", "deletedAt", "description", "electionId", "id", "name", "raceTypeId", "slug", "status", "updatedAt" FROM "races";
DROP TABLE "races";
ALTER TABLE "new_races" RENAME TO "races";
CREATE UNIQUE INDEX "races_electionId_slug_key" ON "races"("electionId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
