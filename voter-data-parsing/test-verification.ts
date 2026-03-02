import "dotenv/config";
import { normalizeAddress } from "../src/lib/utils/addressNormalizer";
import { searchAddresses } from "../src/lib/addressLookup";

async function testNormalization() {
  console.log("Testing Normalization...");
  const cases: [string, string][] = [
    ["123 Main Street", "123 MAIN ST"],
    ["456 North Oak Road", "456 N OAK RD"],
    ["789 South   Pine  Avenue", "789 S PINE AVE"],
    ["101 West Elm Blvd.", "101 W ELM BLVD"],
    ["East River Dr", "E RIVER DR"],
  ];

  for (const [input, expected] of cases) {
    const result = normalizeAddress(input);
    if (result === expected) {
      console.log(`✓ ${input} -> ${result}`);
    } else {
      console.error(`❌ ${input} -> ${result} (Expected: ${expected})`);
    }
  }
}

async function testSearch() {
  console.log("\nTesting Search...");
  try {
    // Search for something unlikely first
    const res1 = await searchAddresses("Zero Results Street");
    console.log(`Search 'Zero Results Street': Found ${res1.length} results`);

    // Search for generic term (might find something if existing data, but likely empty in dry environment)
    const res2 = await searchAddresses("Main");
    console.log(`Search 'Main': Found ${res2.length} results`);
    if (res2.length > 0) {
      console.log("Sample result:", JSON.stringify(res2[0], null, 2));
    }
  } catch (err) {
    console.error("Search failed:", err);
  }
}

async function main() {
  await testNormalization();
  await testSearch();
}

main();
