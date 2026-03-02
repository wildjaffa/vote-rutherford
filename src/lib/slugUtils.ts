/**
 * Generates a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(text: string, text2?: string): string {
  return (text + (text2 ? "-" + text2 : ""))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
