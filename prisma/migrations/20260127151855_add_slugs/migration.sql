/*
  Warnings:

  - A unique constraint covering the columns `[raceId,slug]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `elections` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[electionId,slug]` on the table `races` will be added. If there are existing duplicate values, this will fail.
  - The required column `slug` was added to the `candidates` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `slug` was added to the `elections` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `slug` was added to the `races` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "races" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "candidates_raceId_slug_key" ON "candidates"("raceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "elections_slug_key" ON "elections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "races_electionId_slug_key" ON "races"("electionId", "slug");
