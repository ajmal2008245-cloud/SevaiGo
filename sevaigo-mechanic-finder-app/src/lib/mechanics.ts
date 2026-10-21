import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { type MechanicView } from "@/lib/mechanic-shared";
import { supabase } from "@/lib/supabaseClient";
import { INITIAL_MECHANICS } from "@/db/initialData";
export { DEMO_LOCATION } from "@/lib/mechanic-shared";
export type { MechanicView } from "@/lib/mechanic-shared";

type MechanicRow = typeof mechanics.$inferSelect;

export type MechanicQuery = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  vehicleType?: string;
  problem?: string;
  search?: string;
  sort?: string;
  openOnly?: boolean;
  availableOnly?: boolean;
  includeUnapproved?: boolean;
};

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isShopOpen(openTime: string, closeTime: string) {
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  if (openTime <= closeTime) return current >= openTime && current <= closeTime;
  return current >= openTime || current <= closeTime;
}

export function normalizeAvailability(status?: string | null): "available" | "busy" | "offline" {
  const s = (status || "").toLowerCase();
  if (s === "free" || s === "available") return "available";
  if (s === "busy") return "busy";
  return "offline";
}

export function toMechanicView(row: MechanicRow, latitude: number, longitude: number): MechanicView {
  const distance = distanceKm(latitude, longitude, row.latitude, row.longitude);
  const normalizedStatus = normalizeAvailability(row.availabilityStatus);
  return {
    id: row.id,
    slug: row.slug,
    shopName: row.shopName,
    ownerName: row.ownerName,
    ownerPhoto: row.ownerPhoto || "/images/owner-1.jpg",
    phone: row.phone,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    vehicleTypes: row.vehicleTypes,
    specializations: row.specializations,
    openTime: row.openTime,
    closeTime: row.closeTime,
    rating: row.rating,
    reviewCount: row.reviewCount,
    photos: row.photos,
    isVerified: row.isVerified,
    availabilityStatus: normalizedStatus,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    yearsExperience: row.yearsExperience,
    distanceKm: Math.round(distance * 10) / 10,
    etaMinutes: Math.max(2, Math.round(distance * 3.5 + 2)),
    isOpen: isShopOpen(row.openTime, row.closeTime),
    city: row.city ?? null,
    pincode: row.pincode ?? null,
    shopPhone: row.shopPhone ?? null,
    workingDays: row.workingDays ?? null,
    isRegisteredOwner: Boolean(row.ownerUserId),
    spareParts: row.spareParts ?? ["Tubes", "Spark Plugs", "Engine Oil", "Brake Pads"],
    isOnline: row.isOnline ?? true,
  };
}

function matchesVehicleType(shopTypes: string[], requestedType?: string): boolean {
  if (!requestedType || requestedType === "all") return true;
  const req = requestedType.toLowerCase();
  if (req === "bike" || req === "2w") return shopTypes.includes("2w") || shopTypes.includes("bike");
  if (req === "car" || req === "4w") return shopTypes.includes("4w") || shopTypes.includes("car");
  if (req === "auto" || req === "3w") return shopTypes.includes("3w") || shopTypes.includes("auto") || shopTypes.includes("4w");
  if (req === "truck") return shopTypes.includes("truck") || shopTypes.includes("commercial");
  if (req === "other") return true;
  return shopTypes.includes(req);
}

function matchesProblem(specializations: string[], problem?: string): boolean {
  if (!problem || problem === "all" || problem === "other" || problem === "Other") return true;
  const p = problem.toLowerCase();
  const specs = specializations.map((s) => s.toLowerCase());

  if (p === "puncture") {
    return specs.some((s) => s.includes("puncture") || s.includes("tyre") || s.includes("tire") || s.includes("general"));
  }
  if (p === "battery") {
    return specs.some((s) => s.includes("battery") || s.includes("electrical") || s.includes("general"));
  }
  if (p === "engine") {
    return specs.some((s) => s.includes("engine") || s.includes("general"));
  }
  if (p === "starting problem" || p === "starting") {
    return specs.some((s) => s.includes("battery") || s.includes("electrical") || s.includes("engine") || s.includes("general"));
  }
  if (p === "fuel issue" || p === "fuel") {
    return specs.some((s) => s.includes("fuel") || s.includes("engine") || s.includes("general"));
  }
  return specs.some((s) => s.includes(p)) || true;
}

export async function getNearbyMechanics(query: MechanicQuery): Promise<MechanicView[]> {
  const radius = Math.min(Math.max(query.radiusKm ?? 7, 0.5), 100);
  const term = query.search?.trim().toLowerCase();
  const userLat = query.latitude;
  const userLng = query.longitude;

  // 1. Primary: Fast bounding box query on Supabase 'shops'
  try {
    const latDelta = radius / 111.0;
    const lngDelta = radius / (111.0 * Math.cos((userLat * Math.PI) / 180));

    const { data: supaRows, error: supaErr } = await supabase
      .from("shops")
      .select("*")
      .eq("verified", true)
      .gte("lat", userLat - latDelta)
      .lte("lat", userLat + latDelta)
      .gte("lng", userLng - lngDelta)
      .lte("lng", userLng + lngDelta);

    if (!supaErr && supaRows && supaRows.length > 0) {
      const supaShops: MechanicView[] = supaRows
        .map((row: any) => {
          const lat = Number(row.lat ?? row.latitude ?? userLat);
          const lng = Number(row.lng ?? row.longitude ?? userLng);
          const dist = distanceKm(userLat, userLng, lat, lng);
          const rawServices: string[] = Array.isArray(row.services) ? row.services : [];
          const vTypes = rawServices.filter((s: string) =>
            ["2w", "4w", "truck", "bus", "Bike", "Car", "Auto", "bike", "car"].includes(s)
          );
          if (vTypes.length === 0) vTypes.push("2w", "4w");

          return {
            id: String(row.id),
            slug: String(row.id),
            shopName: row.shop_name || row.shopName || "Mechanic Workshop",
            ownerName: row.owner_name || row.ownerName || "Verified Specialist",
            ownerPhoto: "/images/owner-1.jpg",
            phone: row.phone || "",
            shopPhone: row.phone || "",
            whatsapp: row.phone || "",
            additionalPhone: "",
            address: row.address || "Tamil Nadu, India",
            city: "Tamil Nadu",
            latitude: lat,
            longitude: lng,
            vehicleTypes: vTypes,
            specializations: rawServices.length > 0 ? rawServices : ["General service", "Puncture", "Battery", "Engine"],
            openTime: "08:00",
            closeTime: "21:00",
            rating: 4.9,
            reviewCount: 18,
            photos: ["/images/workshop-1.jpg"],
            isVerified: Boolean(row.verified ?? true),
            availabilityStatus: "available",
            priceMin: 250,
            priceMax: 2000,
            yearsExperience: 5,
            distanceKm: Math.round(dist * 10) / 10,
            etaMinutes: Math.max(2, Math.round(dist * 3.5 + 2)),
            isOpen: true,
            isRegisteredOwner: true,
          };
        })
        .filter((shop: MechanicView) => shop.distanceKm <= radius)
        .filter((shop: MechanicView) => matchesVehicleType(shop.vehicleTypes, query.vehicleType))
        .filter((shop: MechanicView) => matchesProblem(shop.specializations, query.problem))
        .filter(
          (shop: MechanicView) =>
            !term ||
            `${shop.shopName} ${shop.address} ${shop.specializations.join(" ")}`.toLowerCase().includes(term)
        );

      supaShops.sort((a, b) => a.distanceKm - b.distanceKm);

      if (supaShops.length > 0) {
        return supaShops;
      }
    }
  } catch (err) {
    console.warn("[SevaiGo] Supabase bounding box query error, checking local DB:", err);
  }

  // 2. Secondary fallback: Local DB verified mechanics
  let rows: MechanicRow[] = [];
  try {
    if (query.includeUnapproved) {
      rows = (await db.select().from(mechanics)) as MechanicRow[];
    } else {
      rows = (await db.select().from(mechanics).where(and(
        eq(mechanics.isVerified, true),
        eq(mechanics.approvalStatus, "approved")
      ))) as MechanicRow[];
    }
  } catch (err) {
    console.warn("[SevaiGo] Local DB query note:", err);
  }

  const shops: MechanicView[] = rows
    .map((row: MechanicRow) => toMechanicView(row, query.latitude, query.longitude))
    .filter((shop: MechanicView) => shop.distanceKm <= radius)
    .filter((shop: MechanicView) => matchesVehicleType(shop.vehicleTypes, query.vehicleType))
    .filter((shop: MechanicView) => matchesProblem(shop.specializations, query.problem))
    .filter(
      (shop: MechanicView) =>
        !term ||
        `${shop.shopName} ${shop.address} ${shop.specializations.join(" ")}`.toLowerCase().includes(term)
    )
    .filter((shop: MechanicView) => !query.openOnly || shop.isOpen)
    .filter((shop: MechanicView) => !query.availableOnly || shop.availabilityStatus === "available");

  shops.sort((a: MechanicView, b: MechanicView) => a.distanceKm - b.distanceKm);

  return shops;
}
