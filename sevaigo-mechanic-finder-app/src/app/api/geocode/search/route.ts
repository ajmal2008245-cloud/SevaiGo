export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return Response.json({ error: "Search query 'q' parameter is required" }, { status: 400 });
    }

    // Try search query directly; append India context if no country mentioned
    const searchQuery = /india/i.test(query) ? query : `${query}, India`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=jsonv2&addressdetails=1&limit=5`,
      {
        headers: {
          "User-Agent": "SevaiGoRoadsideRescue/2.0 (support@sevaigo.in)",
          "Accept-Language": "en",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!nomRes.ok) {
      return Response.json({ success: true, results: [] });
    }

    const items = await nomRes.json();
    if (!Array.isArray(items)) {
      return Response.json({ success: true, results: [] });
    }

    const results = items.map((item: any) => {
      const addr = item.address || {};
      const area = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.town || addr.city_district || addr.road || "";
      const city = addr.city || addr.town || addr.county || addr.state_district || "";
      const shortLabel = [area, city].filter(Boolean).join(", ") || item.name || item.display_name.split(",")[0];

      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        shortLabel,
        city,
        area,
        pincode: addr.postcode || "",
      };
    });

    return Response.json(
      { success: true, results },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to search location" }, { status: 500 });
  }
}
