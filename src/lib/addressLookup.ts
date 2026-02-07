import { Prisma } from "../generated/prisma/client";
import prisma from "./prisma";
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

  // Sanitize input to prevent FTS injection (e.g. users typing '*', 'OR', 'AND')
  // We keep only uppercase alphanumeric characters and spaces
  // Replace other chars with space to treat them as separators
  const sanitaryQuery = normalizedQuery.replace(/[^A-Z0-9\s]/g, " ");
  const terms = sanitaryQuery.split(/\s+/).filter(Boolean);

  if (terms.length === 0) return [];

  const ftsQuery = terms.map((t) => `${t}*`).join(" ");

  // 1. Get matching IDs from FTS
  // We select 'id' from the FTS table
  try {
    const matches = await prisma.$queryRaw<
      { id: string; address: string; city: string; zip: string }[]
    >(Prisma.sql`
      SELECT id, normalizedAddress as [address], city, zip FROM voter_addresses_fts 
      WHERE voter_addresses_fts MATCH ${ftsQuery} 
      ORDER BY rank
      LIMIT ${limit}
    `);

    return matches;
  } catch (error) {
    console.error("Search failed:", error);
    // Fallback or rethrow?
    // If FTS table doesn't exist (e.g. migration failed), this will throw.
    return [];
  }
}
