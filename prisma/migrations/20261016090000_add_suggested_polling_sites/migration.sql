ALTER TABLE "voter_addresses"
ADD COLUMN "suggestedEarlyVotingSiteId" TEXT,
ADD COLUMN "suggestedDayOfVotingSiteId" TEXT;

ALTER TABLE "voter_addresses"
ADD CONSTRAINT "voter_addresses_suggestedEarlyVotingSiteId_fkey"
FOREIGN KEY ("suggestedEarlyVotingSiteId") REFERENCES "sites"("id")
ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "voter_addresses"
ADD CONSTRAINT "voter_addresses_suggestedDayOfVotingSiteId_fkey"
FOREIGN KEY ("suggestedDayOfVotingSiteId") REFERENCES "sites"("id")
ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

ALTER TABLE "voter_addresses"
VALIDATE CONSTRAINT "voter_addresses_suggestedEarlyVotingSiteId_fkey";

ALTER TABLE "voter_addresses"
VALIDATE CONSTRAINT "voter_addresses_suggestedDayOfVotingSiteId_fkey";
