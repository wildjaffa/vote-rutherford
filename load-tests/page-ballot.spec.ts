import { test, expect } from "@playwright/test";

// Configuration can be passed via environment variables
const BASE_URL = process.env.BASE_URL || "http://localhost:4321";

test("Personalized Ballot page renders server island", async ({ page }) => {
  // Navigate to the My Ballot page
  await page.goto(`${BASE_URL}/my-ballot`);

  // Verify the basic page structure
  await expect(page.locator("h1")).toContainText("My Ballot");

  // Wait for the server island content to load.
  // We'll look for specific elements within <PersonalizedBallot />.
  // Based on the code, it shows "Change Address" button if a voter is loaded,
  // or "AddressSearch" component if not.
  // By default (no cookies), it should show the AddressSearch.

  const searchInput = page.locator(
    'input[type="text"][placeholder*="address"]',
  );
  const resultsTable = page.locator("section h2");

  // Since it's a server island, it might take a moment to swap from the skeleton.
  // We wait for either the search input (no session) or ballot results (simulated session).
  await expect(searchInput.or(resultsTable).first()).toBeVisible({
    timeout: 15000,
  });
});
