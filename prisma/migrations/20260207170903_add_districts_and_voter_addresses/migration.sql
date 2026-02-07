-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "voter_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "normalizedAddress" TEXT NOT NULL,
    "city" TEXT,
    "zip" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "districts_to_voter_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "districtId" TEXT NOT NULL,
    "voterAddressId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "districts_to_voter_addresses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "districts_to_voter_addresses_voterAddressId_fkey" FOREIGN KEY ("voterAddressId") REFERENCES "voter_addresses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_type_name_number_key" ON "districts"("type", "name", "number");

-- CreateIndex
CREATE INDEX "voter_addresses_normalizedAddress_idx" ON "voter_addresses"("normalizedAddress");

-- CreateIndex

-- CreateIndex
CREATE UNIQUE INDEX "districts_to_voter_addresses_districtId_voterAddressId_key" ON "districts_to_voter_addresses"("districtId", "voterAddressId");

-- Create FTS Table
CREATE VIRTUAL TABLE voter_addresses_fts USING fts5(
    id UNINDEXED,
    address,
    normalizedAddress,
    city,
    zip
);

-- Triggers to keep FTS in sync
CREATE TRIGGER voter_addresses_ai AFTER INSERT ON voter_addresses BEGIN
  INSERT INTO voter_addresses_fts(id, address, normalizedAddress, city, zip) 
  VALUES (new.id, new.address, new.normalizedAddress, new.city, new.zip);
END;

CREATE TRIGGER voter_addresses_ad AFTER DELETE ON voter_addresses BEGIN
  DELETE FROM voter_addresses_fts WHERE id = old.id;
END;

CREATE TRIGGER voter_addresses_au AFTER UPDATE ON voter_addresses BEGIN
  UPDATE voter_addresses_fts SET 
    address = new.address, 
    normalizedAddress = new.normalizedAddress, 
    city = new.city, 
    zip = new.zip
  WHERE id = new.id;
END;
