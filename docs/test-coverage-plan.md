# Test Coverage Plan

## Overview

Goal: Achieve 70-80% code coverage for the vote-rutherford repository.

## Project Analysis

### Current State

- **Framework**: Astro 5 + TypeScript + Prisma
- **Test Setup**: None (Vitest not installed, Playwright available but unused)
- **Source Files**: ~60+ TypeScript files across `src/lib`, `src/actions`, API routes
- **Dependencies**: Prisma, Firebase, Cloudflare, MeiliSearch, BullMQ

### Testable Code Categories

| Category          | Files                                                  | Testing Approach        |
| ----------------- | ------------------------------------------------------ | ----------------------- |
| Pure Utilities    | `slugUtils.ts`, `addressNormalizer.ts`, `auditHash.ts` | Direct unit tests       |
| Validation Models | `upsert*.ts`                                           | Unit tests with Zod     |
| Error Utilities   | `utils.ts`, `actions/utils.ts`                         | Unit tests              |
| Audit/Permissions | `auditUtils.ts`, `permissions.ts`                      | Mock Prisma             |
| Service Layer     | `elections.ts`, `races.ts`, `candidates.ts`            | Test database           |
| API Routes        | `/pages/api/**/*.ts`                                   | Supertest or Playwright |
| E2E Flows         | Admin CRUD operations                                  | Playwright              |

---

## Phase 1: Setup Test Infrastructure

### 1.1 Install Dependencies

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/jest-dom
```

### 1.2 Create Vitest Configuration

Create `vite.config.ts` or update existing:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
      "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: ["node_modules/", "dist/", ".astro/", "*.config.*", "**/*.d.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### 1.3 Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 1.4 Create Test Setup

Create `tests/setup.ts`:

```typescript
import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach } from "vitest";

// Global test setup
beforeAll(() => {
  // Setup test environment
});

// Cleanup after all tests
afterAll(() => {
  // Cleanup resources
});
```

Update `tsconfig.json` to include test types:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  }
}
```

---

## Phase 2: Test Database Setup

### 2.1 Create Test Database

Option A: Use separate SQLite database for tests

```bash
cp prisma/dev.db prisma/test.db
```

Option B: Use environment variable to switch DB

In `prisma/prisma.ts`:

```typescript
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
```

### 2.2 Create Test Seed Script

Create `prisma/seed.test.ts`:

```typescript
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

export async function seedTestDatabase() {
  // Clear existing data
  await prisma.candidatePolicyResponseClarification.deleteMany();
  await prisma.candidatePolicyResponse.deleteMany();
  await prisma.candidateExternalLink.deleteMany();
  await prisma.candidateQualification.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.race.deleteMany();
  await prisma.policyQuestion.deleteMany();
  await prisma.election.deleteMany();

  // Seed test data...
}

export async function cleanupTestDatabase() {
  await prisma.$executeRaw`DELETE FROM sqlite_master WHERE type='table'`;
}

export { prisma };
```

---

## Phase 3: Unit Tests Implementation

### Tier 1: Pure Functions (No Mocks)

These files contain pure functions with no external dependencies.

#### `src/lib/slugUtils.ts` (14 LOC)

**Test Cases:**

- Basic slug generation
- Two-word input with separator
- Special characters removal
- Multiple spaces collapse
- Leading/trailing hyphens removal
- Empty string handling

**Example Test:**

```typescript
import { describe, it, expect } from "vitest";
import { generateSlug } from "../src/lib/slugUtils";

describe("generateSlug", () => {
  it("converts text to lowercase hyphenated slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("appends second parameter with hyphen", () => {
    expect(generateSlug("John", "Smith")).toBe("john-smith");
  });

  it("removes special characters", () => {
    expect(generateSlug("Hello! @World#")).toBe("hello-world");
  });

  it("collapses multiple spaces", () => {
    expect(generateSlug("Hello    World")).toBe("hello-world");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug("  Hello World  ")).toBe("hello-world");
  });
});
```

#### `src/lib/utils/addressNormalizer.ts` (217 LOC)

**Test Cases:**

- Empty string handling
- Basic normalization (uppercase, trim)
- Punctuation removal (.,#)
- Directional standardization (North->N, South->S, etc.)
- Suffix standardization (Street->ST, Avenue->AVE, etc.)
- Street name preservation (not in suffix map)
- Combined transformations

**Example Test:**

```typescript
import { describe, it, expect } from "vitest";
import { normalizeAddress } from "../src/lib/utils/addressNormalizer";

describe("normalizeAddress", () => {
  it("handles empty string", () => {
    expect(normalizeAddress("")).toBe("");
  });

  it("converts to uppercase", () => {
    expect(normalizeAddress("main street")).toBe("MAIN STREET");
  });

  it("standardizes directions", () => {
    expect(normalizeAddress("100 North Main Street")).toBe("100 N MAIN ST");
  });

  it("standardizes suffixes", () => {
    expect(normalizeAddress("100 Main Avenue")).toBe("100 MAIN AVE");
    expect(normalizeAddress("100 Oak Boulevard")).toBe("100 OAK BLVD");
  });

  it("preserves ambiguous street names", () => {
    // Lake, Pine, Hill should NOT be normalized
    expect(normalizeAddress("100 Lake Drive")).toBe("100 LAKE DR");
    expect(normalizeAddress("1 Pine Street")).toBe("1 PINE ST");
  });
});
```

#### `src/lib/auditHash.ts` (15 LOC)

**Test Cases:**

- Hash computation consistency
- Same input produces same hash
- Different inputs produce different hashes
- Null previousHash handling
- Non-null previousHash affects output

#### `src/lib/services/utils.ts` (21 LOC)

**Test Cases:**

- `isServiceError` type guard
- `makeError` creation with all parameters
- `makeError` with only message
- Error code propagation
- Error details propagation

**Example Test:**

```typescript
import { describe, it, expect } from "vitest";
import { makeError, isServiceError } from "../src/lib/services/utils";

describe("makeError", () => {
  it("creates error with message", () => {
    const err = makeError("Test error");
    expect(err.message).toBe("Test error");
  });

  it("creates error with code", () => {
    const err = makeError("Not found", 404);
    expect(err.code).toBe(404);
  });

  it("creates error with details", () => {
    const err = makeError("Validation failed", 400, { field: "name" });
    expect(err.details).toEqual({ field: "name" });
  });
});

describe("isServiceError", () => {
  it("returns true for ServiceError", () => {
    expect(isServiceError(makeError("test"))).toBe(true);
  });

  it("returns false for regular Error", () => {
    expect(isServiceError(new Error("test"))).toBe(false);
  });
});
```

#### `src/constants.ts` (38 LOC)

**Test Cases:**

- `LinkTypes` object completeness
- `socialLinkTypes` array membership
- `PartyCategories` values
- `QualificationTypes` values

### Tier 2: Validation Schemas

#### `src/lib/models/upsertElection.ts` (36 LOC)

**Test Cases:**

- Valid election data passes
- Missing required fields fail
- Invalid date format fails
- Optional fields work
- Policy questions validation

```typescript
import { describe, it, expect } from "vitest";
import { upsertElectionSchema } from "../src/lib/models/upsertElection";

describe("upsertElectionSchema", () => {
  it("validates valid election data", () => {
    const valid = {
      name: "Test Election",
      description: "Test description",
      date: new Date("2024-11-05"),
      slug: "test-election",
    };
    const result = upsertElectionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalid = { name: "Test" };
    const result = upsertElectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const invalid = {
      name: "",
      description: "Test",
      date: new Date(),
      slug: "test",
    };
    const result = upsertElectionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

#### `src/lib/models/upsertRace.ts`, `src/lib/models/upsertCandidate.ts`

Similar validation tests for race and candidate schemas.

### Tier 3: Audit & Permissions (Mock Prisma)

#### `src/lib/permissions.ts` (68 LOC)

Since these functions currently return `true`, tests should verify this behavior and prepare for future auth implementation.

**Test Cases:**

- `canManageElections()` returns true
- `canManageElection(id)` returns true
- `canManageRace(id)` returns true
- `canManageCandidate(id)` returns true
- `getCurrentUserId(sessionCookie)` handles undefined

#### `src/lib/auditUtils.ts` (145 LOC)

**Test Cases:**

- `getEntityAuditChain()` returns correct structure
- `getEntitiesAuditChains()` handles multiple entities
- `getRecentAuditActivity()` respects limit
- `getUserAuditActivity()` filters by user
- `deleteAuditLogEntry()` soft deletes

**Mock Setup:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEntityAuditChain } from "../src/lib/auditUtils";

// Mock prisma
vi.mock("../src/lib/prisma", () => ({
  default: {
    auditLog: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
```

### Tier 4: Service Layer (Test Database)

These tests require a seeded test database.

#### `src/lib/services/elections.ts`

**Test Cases:**

- `validateElectionPayload()` validation
- `createElection()` success
- `createElection()` permission denied
- `updateElection()` success
- `updateElection()` not found
- `deleteElection()` success
- `getUpcomingElections()` filters by date

#### `src/lib/services/races.ts`

**Test Cases:**

- `validateRacePayload()` validation
- `createRace()` success
- `createRace()` missing electionId
- `createRace()` election not found
- `updateRace()` success
- `reorderRaces()` updates order
- `deleteRace()` success

#### `src/lib/services/candidates.ts`

**Test Cases:**

- `validateCandidatePayload()` validation
- `createCandidate()` with all fields
- `createCandidate()` with external links
- `createCandidate()` with policy responses
- `createCandidate()` with qualifications
- `updateCandidate()` partial update
- `deleteCandidate()` success

---

## Phase 4: E2E Tests with Playwright

### 4.1 Configure Playwright

Update or create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 E2E Test Scenarios

#### `e2e/admin/auth.spec.ts`

- Admin login flow
- Admin logout flow
- Protected route access

#### `e2e/admin/elections.spec.ts`

- Create election
- Edit election
- Delete election
- View election list

#### `e2e/admin/races.spec.ts`

- Create race within election
- Edit race
- Delete race
- Reorder races

#### `e2e/admin/candidates.spec.ts`

- Create candidate
- Edit candidate (all fields)
- Edit candidate (partial)
- Delete candidate
- Upload candidate photo

#### `e2e/admin/policy-questions.spec.ts`

- Create policy question
- Edit policy question
- Delete policy question
- Assign question to race

### 4.3 Example E2E Test

```typescript
import { test, expect } from "@playwright/test";

test.describe("Admin Elections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Login if needed
  });

  test("can create a new election", async ({ page }) => {
    await page.goto("/admin/elections");
    await page.click('button:has-text("New Election")');

    await page.fill('input[name="name"]', "Test Election 2024");
    await page.fill('input[name="description"]', "Test description");
    await page.fill('input[name="slug"]', "test-election-2024");
    await page.fill('input[name="date"]', "2024-11-05");

    await page.click('button:has-text("Create")');

    await expect(page.locator("text=Test Election 2024")).toBeVisible();
  });
});
```

---

## Phase 5: Coverage Integration

### 5.1 CI Configuration

Add to GitHub Actions (`.github/workflows/test.yml`):

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:coverage
        env:
          DATABASE_URL: "file:./prisma/test.db"

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

      - name: Run E2E tests
        run: npm run test:e2e
        if: github.event_name == 'push'
```

### 5.2 Coverage Badge

Add to README:

```markdown
[![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen)](coverage/lcov-report/index.html)
```

---

## File Structure

```
vote-rutherford/
├── tests/
│   ├── setup.ts
│   ├── utils/
│   │   ├── db.ts
│   │   └── mocks.ts
│   └── helpers/
│       └── test-data.ts
├── e2e/
│   ├── admin/
│   │   ├── auth.spec.ts
│   │   ├── elections.spec.ts
│   │   ├── races.spec.ts
│   │   ├── candidates.spec.ts
│   │   └── policy-questions.spec.ts
│   └── playwright.config.ts
├── src/
│   ├── lib/
│   │   ├── slugUtils.test.ts
│   │   ├── auditHash.test.ts
│   │   ├── permissions.test.ts
│   │   ├── utils/
│   │   │   ├── addressNormalizer.test.ts
│   │   │   └── environment.test.ts
│   │   ├── services/
│   │   │   ├── utils.test.ts
│   │   │   ├── elections.test.ts
│   │   │   ├── races.test.ts
│   │   │   └── candidates.test.ts
│   │   ├── auditUtils.test.ts
│   │   └── models/
│   │       ├── upsertElection.test.ts
│   │       ├── upsertRace.test.ts
│   │       └── upsertCandidate.test.ts
│   ├── actions/
│   │   └── utils.test.ts
│   └── constants.test.ts
├── vitest.config.ts
├── playwright.config.ts
└── prisma/
    └── test.db
```

---

## Implementation Order

1. **Week 1**: Setup infrastructure (Vitest, Playwright, test DB)
2. **Week 2**: Tier 1 - Pure functions (slugUtils, addressNormalizer, auditHash)
3. **Week 3**: Tier 2 - Validation schemas, Tier 3 - Audit/Permissions
4. **Week 4**: Tier 4 - Service layer tests
5. **Week 5**: E2E tests for critical flows
6. **Week 6**: CI integration, coverage threshold enforcement

---

## Success Metrics

| Metric                 | Target |
| ---------------------- | ------ |
| Line Coverage          | 70%+   |
| Function Coverage      | 70%+   |
| Branch Coverage        | 70%+   |
| Unit Tests             | 200+   |
| E2E Tests              | 15+    |
| Critical Paths Covered | 100%   |

---

## Notes

- All test files should follow naming convention: `*.test.ts` or `*.spec.ts`
- Use descriptive test names that explain what is being tested
- Mock external dependencies (Firebase, Cloudflare) where possible
- Keep tests isolated - each test should not depend on others
- Run `npm run test:coverage` locally before pushing to ensure CI passes
