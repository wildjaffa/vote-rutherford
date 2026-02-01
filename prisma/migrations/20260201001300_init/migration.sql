-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "headerImageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "archivedAt" DATETIME,
    "blobStorageReferenceId" TEXT,
    CONSTRAINT "elections_headerImageId_fkey" FOREIGN KEY ("headerImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "elections_blobStorageReferenceId_fkey" FOREIGN KEY ("blobStorageReferenceId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raceTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "races_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "races_raceTypeId_fkey" FOREIGN KEY ("raceTypeId") REFERENCES "race_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "race_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "birthYear" INTEGER,
    "biography" TEXT,
    "biographyRedacted" TEXT,
    "profileImageId" TEXT,
    "historicalLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidates_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "candidates_historicalLinkId_fkey" FOREIGN KEY ("historicalLinkId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidate_external_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidate_id" TEXT NOT NULL,
    "hyperlink" TEXT NOT NULL,
    "externalLinkTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidate_external_links_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidate_external_links_externalLinkTypeId_fkey" FOREIGN KEY ("externalLinkTypeId") REFERENCES "external_link_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "external_link_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "policy_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "policy_questions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "policy_questions_to_races" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyQuestionId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "policy_questions_to_races_policyQuestionId_fkey" FOREIGN KEY ("policyQuestionId") REFERENCES "policy_questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "policy_questions_to_races_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidate_policy_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "policyQuestionId" TEXT NOT NULL,
    "requestSentAt" DATETIME NOT NULL,
    "responseReceivedAt" DATETIME,
    "response" TEXT NOT NULL,
    "responseRedacted" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidate_policy_responses_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidate_policy_responses_policyQuestionId_fkey" FOREIGN KEY ("policyQuestionId") REFERENCES "policy_questions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidate_policy_response_clarifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidatePolicyResponseId" TEXT NOT NULL,
    "clarification" TEXT NOT NULL,
    "clarificationRedacted" TEXT,
    "clarificationReceivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidate_policy_response_clarifications_candidatePolicyResponseId_fkey" FOREIGN KEY ("candidatePolicyResponseId") REFERENCES "candidate_policy_responses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidate_qualifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "qualification_description" TEXT NOT NULL,
    "qualificationTypeId" INTEGER NOT NULL,
    "qualification_url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "candidate_qualifications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidate_qualifications_qualificationTypeId_fkey" FOREIGN KEY ("qualificationTypeId") REFERENCES "qualification_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "qualification_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userTypeId" INTEGER NOT NULL,
    "profileImageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "users_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "user_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_profileImageId_fkey" FOREIGN KEY ("profileImageId") REFERENCES "blob_storage_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "users_to_elections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "users_to_elections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_to_elections_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blob_storage_references" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileLocation" TEXT NOT NULL,
    "blobStorageTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "blob_storage_references_blobStorageTypeId_fkey" FOREIGN KEY ("blobStorageTypeId") REFERENCES "blob_storage_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blob_storage_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB NOT NULL,
    "previousHash" TEXT,
    "currentHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
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
CREATE INDEX "audit_logs_entityId_entityType_idx" ON "audit_logs"("entityId", "entityType");
