-- AlterTable
ALTER TABLE "candidate_external_links" ADD COLUMN "displayText" TEXT;
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
    "profileImageId" TEXT,
    "historicalLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidates_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "candidates_historicalLinkId_fkey" FOREIGN KEY ("historicalLinkId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_candidates" ("birthYear", "createdAt", "deletedAt", "firstName", "historicalLinkId", "id", "lastName", "middleName", "profileImageId", "raceId", "slug", "updatedAt") SELECT "birthYear", "createdAt", "deletedAt", "firstName", "historicalLinkId", "id", "lastName", "middleName", "profileImageId", "raceId", "slug", "updatedAt" FROM "candidates";
DROP TABLE "candidates";
ALTER TABLE "new_candidates" RENAME TO "candidates";
CREATE UNIQUE INDEX "candidates_raceId_slug_key" ON "candidates"("raceId", "slug");
CREATE TABLE "new_policy_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "policy_questions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_policy_questions" ("createdAt", "deletedAt", "descriptionText", "electionId", "id", "questionText", "updatedAt") SELECT "createdAt", "deletedAt", "descriptionText", "electionId", "id", "questionText", "updatedAt" FROM "policy_questions";
DROP TABLE "policy_questions";
ALTER TABLE "new_policy_questions" RENAME TO "policy_questions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
