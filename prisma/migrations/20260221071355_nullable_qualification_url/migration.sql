/*
  Warnings:

  - You are about to drop the `candidate_qualifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_candidate_qualifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "qualification_description" TEXT NOT NULL,
    "qualificationTypeId" INTEGER NOT NULL,
    "qualification_url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidate_qualifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidate_qualifications_qualificationTypeId_fkey" FOREIGN KEY ("qualificationTypeId") REFERENCES "qualification_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_candidate_qualifications" ("candidateId", "createdAt", "deletedAt", "id", "qualificationTypeId", "qualification_description", "qualification_url", "updatedAt") SELECT "candidateId", "createdAt", "deletedAt", "id", "qualificationTypeId", "qualification_description", "qualification_url", "updatedAt" FROM "candidate_qualifications";
DROP TABLE "candidate_qualifications";
ALTER TABLE "new_candidate_qualifications" RENAME TO "candidate_qualifications";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
