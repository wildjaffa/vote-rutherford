import { MeiliSearch } from "meilisearch";
import { normalizeAddress } from "./utils/addressNormalizer";
import { env } from "./utils/environment";

export interface AddressSearchResult {
  id: string;
  address: string;
  city: string;
  zip: string;
  districtGroupId: string | null;
}

const meilisearchClient = new MeiliSearch({
  host: env("MEILISEARCH_HOST") || "http://localhost:7700",
  apiKey: env("MEILISEARCH_API_KEY") || "masterKey",
});

export async function searchAddresses(
  q: string,
  limit = 4,
): Promise<AddressSearchResult[]> {
  const normalizedQuery = normalizeAddress(q);
  if (!normalizedQuery) return [];

  try {
    const response = await meilisearchClient
      .index("addresses")
      .search(normalizedQuery, {
        limit,
        matchingStrategy: "all",
      });

    return response.hits.map((hit) => ({
      id: hit.id as string,
      address: hit.address as string,
      city: hit.city as string,
      zip: hit.zip as string,
      districtGroupId: hit.districtGroupId as string | null,
    }));
  } catch (error) {
    console.error("Meilisearch search failed:", error);
    return [];
  }
}
