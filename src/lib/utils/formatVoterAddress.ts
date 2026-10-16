function normalizeAddressPart(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

export function formatVoterAddress(
  address: string,
  city?: string | null,
  zip?: string | null,
): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedCity = city ? normalizeAddressPart(city) : "";
  const normalizedZip = zip ? normalizeAddressPart(zip) : "";
  let addressCity = city?.trim() ?? "";
  let addressZip = zip?.trim() ?? "";
  let state = "";

  if (
    normalizedZip &&
    parts.length > 0 &&
    normalizeAddressPart(parts[parts.length - 1] ?? "") === normalizedZip
  ) {
    const embeddedZip = parts.pop() ?? "";
    addressZip ||= embeddedZip;
  }

  if (parts.length > 1 && /^[a-z]{2}$/i.test(parts[parts.length - 1] ?? "")) {
    state = parts.pop() ?? "";
  }

  if (
    normalizedCity &&
    parts.length > 0 &&
    normalizeAddressPart(parts[parts.length - 1] ?? "") === normalizedCity
  ) {
    const embeddedCity = parts.pop() ?? "";
    addressCity ||= embeddedCity;
  }

  const street = parts.join(" ").replace(/\s+/g, " ").trim();
  const locality = [addressCity, [state, addressZip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return [street, locality].filter(Boolean).join(", ");
}
