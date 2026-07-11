-- Rename race_types table to race_scopes
ALTER TABLE "race_types" RENAME TO "race_scopes";

-- Rename primary key constraint
ALTER TABLE "race_scopes" RENAME CONSTRAINT "race_types_pkey" TO "race_scopes_pkey";

-- Rename raceTypeId column to raceScopeId in races table
ALTER TABLE "races" RENAME COLUMN "raceTypeId" TO "raceScopeId";

-- Rename foreign key constraint
ALTER TABLE "races" RENAME CONSTRAINT "races_raceTypeId_fkey" TO "races_raceScopeId_fkey";
