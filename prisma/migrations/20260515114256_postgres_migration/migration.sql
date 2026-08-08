-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "DistrictType" AS ENUM ('US_HOUSE', 'STATE_SENATE', 'STATE_HOUSE', 'JUDICIAL', 'COUNTY', 'MUNICIPAL', 'SCHOOL', 'ROAD', 'PRECINCT', 'COMMISSIONER', 'ALL');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_MAPPING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "earlyVotingStart" TIMESTAMP(3),
    "earlyVotingEnd" TIMESTAMP(3),
    "headerImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "blobStorageReferenceId" TEXT,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raceTypeId" INTEGER NOT NULL,
    "districtId" TEXT,
    "numSelections" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "partyCategory" TEXT NOT NULL DEFAULT 'General Election',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_types" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "race_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "birthYear" INTEGER,
    "partyAffiliation" TEXT,
    "email" TEXT,
    "isIncumbent" BOOLEAN NOT NULL DEFAULT false,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "profileImageId" TEXT,
    "historicalLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_external_links" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "hyperlink" TEXT NOT NULL,
    "displayText" TEXT,
    "externalLinkTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_external_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_link_types" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "external_link_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_questions" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "policy_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_questions_to_races" (
    "id" TEXT NOT NULL,
    "policyQuestionId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "policy_questions_to_races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_policy_responses" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "policyQuestionId" TEXT NOT NULL,
    "requestSentAt" TIMESTAMP(3) NOT NULL,
    "responseReceivedAt" TIMESTAMP(3),
    "response" TEXT NOT NULL,
    "responseRedacted" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_policy_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_policy_response_clarifications" (
    "id" TEXT NOT NULL,
    "candidatePolicyResponseId" TEXT NOT NULL,
    "clarification" TEXT NOT NULL,
    "clarificationRedacted" TEXT,
    "clarificationReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_policy_response_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_qualifications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "qualification_description" TEXT NOT NULL,
    "qualificationTypeId" INTEGER NOT NULL,
    "qualification_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "candidate_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_types" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "qualification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userTypeId" INTEGER NOT NULL,
    "profileImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_types" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users_to_elections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_to_elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_google_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blob_storage_references" (
    "id" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileLocation" TEXT NOT NULL,
    "blobStorageTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blob_storage_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blob_storage_types" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blob_storage_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB NOT NULL,
    "previousHash" TEXT,
    "currentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outreach" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "contactId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "type" "DistrictType" NOT NULL,
    "meta" JSONB,
    "oldDistrictId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voter_addresses" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "city" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "districtGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "voter_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_groups" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_groups_to_districts" (
    "id" TEXT NOT NULL,
    "districtGroupId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_groups_to_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts_to_voter_addresses" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "voterAddressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_to_voter_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_import_jobs" (
    "id" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" JSONB,
    "districtMapping" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RaceToSourceRaces" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RaceToSourceRaces_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "elections_slug_key" ON "elections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "races_electionId_slug_key" ON "races"("electionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_raceId_slug_key" ON "candidates"("raceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_google_accounts_userId_email_key" ON "user_google_accounts"("userId", "email");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_entityType_idx" ON "audit_logs"("entityId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "districts_type_name_number_key" ON "districts"("type", "name", "number");

-- CreateIndex
CREATE INDEX "voter_addresses_normalizedAddress_idx" ON "voter_addresses"("normalizedAddress");

-- CreateIndex
CREATE UNIQUE INDEX "district_groups_hash_key" ON "district_groups"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "district_groups_to_districts_districtGroupId_districtId_key" ON "district_groups_to_districts"("districtGroupId", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "districts_to_voter_addresses_districtId_voterAddressId_key" ON "districts_to_voter_addresses"("districtId", "voterAddressId");

-- CreateIndex
CREATE INDEX "_RaceToSourceRaces_B_index" ON "_RaceToSourceRaces"("B");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_headerImageId_fkey" FOREIGN KEY ("headerImageId") REFERENCES "blob_storage_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_blobStorageReferenceId_fkey" FOREIGN KEY ("blobStorageReferenceId") REFERENCES "blob_storage_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_raceTypeId_fkey" FOREIGN KEY ("raceTypeId") REFERENCES "race_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_historicalLinkId_fkey" FOREIGN KEY ("historicalLinkId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_external_links" ADD CONSTRAINT "candidate_external_links_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_external_links" ADD CONSTRAINT "candidate_external_links_externalLinkTypeId_fkey" FOREIGN KEY ("externalLinkTypeId") REFERENCES "external_link_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_questions" ADD CONSTRAINT "policy_questions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_questions_to_races" ADD CONSTRAINT "policy_questions_to_races_policyQuestionId_fkey" FOREIGN KEY ("policyQuestionId") REFERENCES "policy_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_questions_to_races" ADD CONSTRAINT "policy_questions_to_races_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_policy_responses" ADD CONSTRAINT "candidate_policy_responses_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_policy_responses" ADD CONSTRAINT "candidate_policy_responses_policyQuestionId_fkey" FOREIGN KEY ("policyQuestionId") REFERENCES "policy_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_policy_response_clarifications" ADD CONSTRAINT "candidate_policy_response_clarifications_candidatePolicyRe_fkey" FOREIGN KEY ("candidatePolicyResponseId") REFERENCES "candidate_policy_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_qualifications" ADD CONSTRAINT "candidate_qualifications_qualificationTypeId_fkey" FOREIGN KEY ("qualificationTypeId") REFERENCES "qualification_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "user_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_to_elections" ADD CONSTRAINT "users_to_elections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users_to_elections" ADD CONSTRAINT "users_to_elections_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_google_accounts" ADD CONSTRAINT "user_google_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blob_storage_references" ADD CONSTRAINT "blob_storage_references_blobStorageTypeId_fkey" FOREIGN KEY ("blobStorageTypeId") REFERENCES "blob_storage_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outreach" ADD CONSTRAINT "email_outreach_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outreach" ADD CONSTRAINT "email_outreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voter_addresses" ADD CONSTRAINT "voter_addresses_districtGroupId_fkey" FOREIGN KEY ("districtGroupId") REFERENCES "district_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_groups_to_districts" ADD CONSTRAINT "district_groups_to_districts_districtGroupId_fkey" FOREIGN KEY ("districtGroupId") REFERENCES "district_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_groups_to_districts" ADD CONSTRAINT "district_groups_to_districts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts_to_voter_addresses" ADD CONSTRAINT "districts_to_voter_addresses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts_to_voter_addresses" ADD CONSTRAINT "districts_to_voter_addresses_voterAddressId_fkey" FOREIGN KEY ("voterAddressId") REFERENCES "voter_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RaceToSourceRaces" ADD CONSTRAINT "_RaceToSourceRaces_A_fkey" FOREIGN KEY ("A") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RaceToSourceRaces" ADD CONSTRAINT "_RaceToSourceRaces_B_fkey" FOREIGN KEY ("B") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;
