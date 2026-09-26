/**
 * Simple geocoding service using OpenStreetMap Nominatim API as a fallback.
 * NOTE: Nominatim has usage limits (1 request per second). Do not use for bulk processing.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.append("q", address);
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "VoteRutherford/1.0 (VolunteerRoutingFallback)"
      }
    });

    if (!response.ok) {
      console.error("Geocoding failed:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        address: data[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error during geocoding:", error);
    return null;
  }
}
