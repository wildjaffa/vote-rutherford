import { getLibsql } from "./prisma";
import { normalizeAddress } from "./utils/addressNormalizer";

export interface AddressSearchResult {
  id: string;
  address: string;
  city: string;
  zip: string;
  districtGroupId: string | null;
}

export async function searchAddresses(
  q: string,
  limit = 10,
): Promise<AddressSearchResult[]> {
  const normalizedQuery = normalizeAddress(q);
  if (!normalizedQuery) return [];

  const sanitaryQuery = normalizedQuery.replace(/[^A-Z0-9\s]/g, " ");
  const terms = sanitaryQuery.split(/\s+/).filter(Boolean);

  if (terms.length === 0) return [];

  const ftsQuery = terms.map((t) => `${t}*`).join(" ");

  const libsql = getLibsql();

  try {
    const rs = await libsql.execute({
      sql: `
        SELECT 
          v.id, 
          v.normalizedAddress as [address], 
          v.city, 
          v.zip,
          a.districtGroupId
        FROM voter_addresses_fts v
        LEFT JOIN voter_addresses a ON v.id = a.id
        WHERE voter_addresses_fts MATCH ? 
        ORDER BY rank
        LIMIT ?
      `,
      args: [ftsQuery, limit],
    });

    return rs.rows.map((row) => ({
      id: row.id as string,
      address: row.address as string,
      city: row.city as string,
      zip: row.zip as string,
      districtGroupId: row.districtGroupId as string | null,
    }));
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}
