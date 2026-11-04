export const dynamic = "force-dynamic";

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  residential?: string;
  road?: string;
  village?: string;
  town?: string;
  city_district?: string;
  city?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

function buildReadableAddress(addr: NominatimAddress, fallbackName?: string): { shortLabel: string; fullAddress: string; city: string; area: string; pincode: string } {
  const area =
    addr.suburb ||
    addr.neighbourhood ||
    addr.residential ||
    addr.village ||
    addr.town ||
    addr.city_district ||
    addr.road ||
    "";

  const city = addr.city || addr.town || addr.county || addr.state_district || "";
  const state = addr.state || "";
  const pincode = addr.postcode || "";

  // Form clean short label (e.g. "Gandhipuram, Coimbatore" or "Anna Nagar, Madurai")
  let shortParts: string[] = [];
  if (area) shortParts.push(area);
  if (city && city !== area) shortParts.push(city);
  if (shortParts.length === 0 && fallbackName) {
    shortParts.push(fallbackName.split(",")[0].trim());
  }
  const shortLabel = shortParts.join(", ") || "Current Location";

  // Form detailed readable address
  const fullParts: string[] = [];
  if (addr.road) fullParts.push(addr.road);
  if (area && area !== addr.road) fullParts.push(area);
  if (city && city !== area) fullParts.push(city);
  if (state) fullParts.push(state);
  if (pincode) fullParts.push(pincode);

  const fullAddress = fullParts.length > 0 ? fullParts.join(", ") : fallbackName || shortLabel;

  return { shortLabel, fullAddress, city, area, pincode };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLat = searchParams.get("lat") ?? searchParams.get("latitude");
    const rawLng = searchParams.get("lng") ?? searchParams.get("lon") ?? searchParams.get("longitude");

    if (!rawLat || !rawLng) {
      return Response.json({ error: "Missing latitude or longitude parameters" }, { status: 400 });
    }

    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json({ error: "Invalid coordinate values" }, { status: 400 });
    }

    // 1. Primary reverse geocoding via OpenStreetMap Nominatim with strict timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`,
        {
          headers: {
            "User-Agent": "SevaiGoRoadsideRescue/2.0 (support@sevaigo.in)",
            "Accept-Language": "en",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const addr: NominatimAddress = nomData.address || {};
        const { shortLabel, fullAddress, city, area, pincode } = buildReadableAddress(
          addr,
          nomData.display_name
        );

        return Response.json(
          {
            success: true,
            latitude: lat,
            longitude: lng,
            shortLabel,
            address: fullAddress,
            displayName: nomData.display_name || fullAddress,
            city,
            area,
            pincode,
          },
          { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400" } }
        );
      }
    } catch {
      // Fallback to secondary provider if Nominatim times out or fails
    }

    // 2. Secondary fallback via BigDataCloud client reverse geocode API (free, fast, no key)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(4000) }
      );

      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const area = bdcData.locality || bdcData.subLocality || "";
        const city = bdcData.city || bdcData.principalSubdivision || "";
        const state = bdcData.principalSubdivision || "";
        const pincode = bdcData.postcode || "";

        const shortLabel = [area, city].filter(Boolean).join(", ") || "Current Location";
        const fullAddress = [area, city, state, pincode].filter(Boolean).join(", ") || shortLabel;

        return Response.json(
          {
            success: true,
            latitude: lat,
            longitude: lng,
            shortLabel,
            address: fullAddress,
            displayName: fullAddress,
            city,
            area,
            pincode,
          },
          { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400" } }
        );
      }
    } catch {
      // Both online reverse geocoding providers failed; return clean coordinate string
    }

    // 3. Fallback: return coordinate label
    const fallbackLabel = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    return Response.json({
      success: true,
      latitude: lat,
      longitude: lng,
      shortLabel: fallbackLabel,
      address: fallbackLabel,
      displayName: fallbackLabel,
      city: "",
      area: "",
      pincode: "",
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to reverse geocode location" }, { status: 500 });
  }
}
