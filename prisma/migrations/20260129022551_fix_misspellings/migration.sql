/*
  Warnings:

  - You are about to drop the column `qaulification_url` on the `candidate_qualifications` table. All the data in the column will be lost.
  - You are about to drop the column `questiontext` on the `policy_questions` table. All the data in the column will be lost.
  - Added the required column `qualification_url` to the `candidate_qualifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionText` to the `policy_questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "candidate_qualifications" DROP COLUMN "qaulification_url",
ADD COLUMN     "qualification_url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "policy_questions" DROP COLUMN "questiontext",
ADD COLUMN     "questionText" TEXT NOT NULL;
