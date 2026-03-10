-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "email" TEXT;

-- AlterTable
ALTER TABLE "races" ADD COLUMN "shortName" TEXT;

-- CreateTable
CREATE TABLE "email_outreach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_outreach_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
