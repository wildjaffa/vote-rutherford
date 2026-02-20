/*
  Warnings:

  - You are about to drop the `voter_addresses_fts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voter_addresses_fts_config` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voter_addresses_fts_content` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voter_addresses_fts_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voter_addresses_fts_docsize` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `voter_addresses_fts_idx` table. If the table is not empty, all the data it contains will be lost.

*/

-- RedefineTables
ALTER TABLE "candidate_qualifications" ADD COLUMN "qualification_url_new" TEXT;
UPDATE "candidate_qualifications" SET "qualification_url_new" = "qualification_url";
ALTER TABLE "candidate_qualifications" DROP COLUMN "qualification_url";
ALTER TABLE "candidate_qualifications" RENAME COLUMN "qualification_url_new" TO "qualification_url";
