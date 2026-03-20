-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_email_outreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT,
    "contactId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_outreach_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "email_outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_email_outreach" ("body", "candidateId", "emailAddress", "id", "sentAt", "subject") SELECT "body", "candidateId", "emailAddress", "id", "sentAt", "subject" FROM "email_outreach";
DROP TABLE "email_outreach";
ALTER TABLE "new_email_outreach" RENAME TO "email_outreach";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
