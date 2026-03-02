import { getLibsql } from "./prisma";
import { normalizeAddress } from "./utils/addressNormalizer";

export interface AddressSearchResult {
  id: string;
  address: string;
  city: string;
  zip: string;
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
    const rs: {
      rows: { id: string; address: string; city: string; zip: string }[];
    } = await libsql.execute({
      sql: `
        SELECT id, normalizedAddress as [address], city, zip FROM voter_addresses_fts 
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
    }));
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}
