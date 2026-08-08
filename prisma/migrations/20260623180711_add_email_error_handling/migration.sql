-- AlterTable
ALTER TABLE "email_outreach" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SENT';
