import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics, notifications, users } from "@/db/schema";
import { apiError, cleanText, validImageUrl } from "@/lib/api";
import { createSession, getSessionUser, hashPassword } from "@/lib/auth";
import { DEMO_LOCATION, getNearbyMechanics } from "@/lib/mechanics";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawLat = params.get("lat") ?? params.get("latitude");
    const rawLng = params.get("lng") ?? params.get("longitude");
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    const latitude = Number.isFinite(lat) && lat >= -90 && lat <= 90 && rawLat !== null ? lat : DEMO_LOCATION.latitude;
    const longitude = Number.isFinite(lng) && lng >= -180 && lng <= 180 && rawLng !== null ? lng : DEMO_LOCATION.longitude;
    const radius = Number(params.get("radius") ?? params.get("radiusKm")) || 7;

    const shops = await getNearbyMechanics({
      latitude,
      longitude,
      radiusKm: radius,
      vehicleType: params.get("vehicle") || params.get("vehicleType") || "all",
      problem: params.get("problem") || undefined,
      search: params.get("search") || "",
      sort: params.get("sort") || "distance",
      openOnly: params.get("open") === "true",
      availableOnly: params.get("available") === "true",
      includeUnapproved: params.get("includeUnapproved") === "true",
    });

    return Response.json(
      { success: true, shops, mechanics: shops, latitude, longitude },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" } }
    );
  } catch (err) {
    console.error("[SevaiGo Mechanics API] GET error:", err);
    return Response.json(
      { success: false, shops: [], mechanics: [], latitude: DEMO_LOCATION.latitude, longitude: DEMO_LOCATION.longitude },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request) {
  let user = await getSessionUser();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Invalid request.");

  const ownerName = cleanText(body.ownerName, 80);
  const phone = cleanText(body.phone, 20);
  const shopName = cleanText(body.shopName, 100);
  const address = cleanText(body.address, 250);
  const city = cleanText(body.city, 80) || "Chennai";
  const pincode = cleanText(body.pincode, 10);
  const shopPhone = cleanText(body.shopPhone, 20) || phone;
  const email = cleanText(body.email, 120);
  const password = typeof body.password === "string" ? body.password : "";

  // Validation
  if (shopName.length < 3) return apiError("Shop name must be at least 3 characters.");
  if (ownerName.length < 2) return apiError("Owner full name is required.");
  if (address.length < 8) return apiError("Full shop address must be at least 8 characters.");
  const cleanDigits = phone.replace(/\D/g, "");
  if (cleanDigits.length < 10) return apiError("Enter a valid 10-digit mobile number.");

  // If user is not logged in, auto-create an account
  if (!user) {
    if (!password || password.length < 6) {
      return apiError("Please create a password (at least 6 characters) for your owner account.", 400);
    }
    const userEmail = email.includes("@") ? email.toLowerCase() : `owner_${cleanDigits}@sevaigo.local`;
    
    // Check if user with this email already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (existingUser) {
      return apiError(`An account with email ${userEmail} already exists. Please sign in first.`, 409);
    }

    const [newUser] = await db.insert(users).values({
      name: ownerName,
      email: userEmail,
      phone,
      passwordHash: hashPassword(password),
      role: "owner",
    }).returning();

    await createSession(newUser.id);
    user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    };
  }

  // Ensure this user doesn't already have a workshop registered
  const existing = await db.select({ id: mechanics.id }).from(mechanics).where(eq(mechanics.ownerUserId, user.id)).limit(1);
  if (existing.length) return apiError("You already have a workshop registered under this account.", 409);

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return apiError("Please select an exact location on the map.");
  }

  const openTime = cleanText(body.openTime, 5) || "08:00";
  const closeTime = cleanText(body.closeTime, 5) || "21:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime)) {
    return apiError("Enter valid opening and closing hours (HH:MM).");
  }

  const validTypes = ["2w", "4w", "truck", "bus"];
  const vehicleTypes: string[] = Array.isArray(body.vehicleTypes)
    ? body.vehicleTypes.filter((item: unknown): item is string => typeof item === "string" && validTypes.includes(item))
    : ["2w", "4w"];
  if (!vehicleTypes.length) return apiError("Select at least one shop vehicle type (Bike, Car, or Both).");

  const specializations: string[] = Array.isArray(body.specializations)
    ? body.specializations.filter((item: unknown): item is string => typeof item === "string" && item.length > 0).slice(0, 10)
    : ["General service"];
  if (!specializations.length) return apiError("Choose at least one service offered.");

  const workingDays: string[] = Array.isArray(body.workingDays)
    ? body.workingDays.filter((item: unknown): item is string => typeof item === "string")
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const photos: string[] = Array.isArray(body.photos)
    ? body.photos.map(validImageUrl).filter((item: string | null): item is string => Boolean(item)).slice(0, 4)
    : [];

  const priceMin = Math.max(0, Math.round(Number(body.priceMin) || 250));
  const priceMax = Math.max(priceMin, Math.round(Number(body.priceMax) || 2500));
  const yearsExperience = Math.max(0, Math.min(Math.round(Number(body.yearsExperience) || 3), 70));

  const slug = `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${randomBytes(3).toString("hex")}`;

  const sparePartsList: string[] = Array.isArray(body.spareParts)
    ? body.spareParts.filter((item: unknown): item is string => typeof item === "string" && item.length > 0)
    : [];

  const [shop] = await db.insert(mechanics).values({
    slug,
    ownerUserId: user.id,
    shopName,
    ownerName,
    phone,
    address,
    city,
    pincode,
    shopPhone,
    latitude,
    longitude,
    vehicleTypes,
    specializations,
    workingDays,
    openTime,
    closeTime,
    photos: photos.length ? photos : ["/images/workshop-1.jpg"],
    ownerPhoto: validImageUrl(body.ownerPhoto) || "/images/owner-1.jpg",
    isVerified: false,
    approvalStatus: "pending",
    availabilityStatus: "free",
    priceMin,
    priceMax,
    yearsExperience,
    spareParts: sparePartsList,
    isOnline: true,
  }).returning();

  if (user.role === "user") {
    await db.update(users).set({ role: "owner" }).where(eq(users.id, user.id));
  }

  await db.insert(notifications).values({
    userId: user.id,
    title: "Workshop application received",
    message: `${shopName} has been submitted for review. It will appear on the live map once approved by the SevaiGo team.`,
  });

  // Sync to Supabase shops table
  try {
    await supabase.from('shops').insert({
      shop_name: shopName,
      owner_name: ownerName,
      phone: shopPhone || phone,
      address: address + (city ? `, ${city}` : "") + (pincode ? ` - ${pincode}` : ""),
      lat: latitude,
      lng: longitude,
      services: Array.from(new Set([...vehicleTypes, ...specializations])),
      verified: true,
    });
  } catch (err) {
    console.error("Failed to sync mechanic to Supabase in API:", err);
  }

  return Response.json({
    success: true,
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      approvalStatus: shop.approvalStatus,
      isVerified: shop.isVerified,
    },
    user,
  }, { status: 201 });
}
