import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics } from "@/db/schema";
import { apiError, cleanText, validImageUrl } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in.", 401);
  const [shop] = await db.select().from(mechanics).where(eq(mechanics.ownerUserId, user.id)).limit(1);
  return Response.json({ shop: shop || null });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in.", 401);
  const [shop] = await db.select().from(mechanics).where(eq(mechanics.ownerUserId, user.id)).limit(1);
  if (!shop) return apiError("Workshop not found.", 404);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Invalid request.");

  const updates: Partial<typeof mechanics.$inferInsert> = {};

  if (body.availabilityStatus !== undefined) {
    const status = cleanText(body.availabilityStatus, 15).toLowerCase();
    if (!["available", "free", "busy", "offline"].includes(status)) {
      return apiError("Choose Available, Busy, or Offline availability.");
    }
    updates.availabilityStatus = status === "free" ? "available" : status;
  }

  if (body.businessDoc !== undefined) {
    updates.businessDoc = cleanText(body.businessDoc, 250);
  }

  if (body.openTime !== undefined || body.closeTime !== undefined) {
    const openTime = cleanText(body.openTime ?? shop.openTime, 5);
    const closeTime = cleanText(body.closeTime ?? shop.closeTime, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime)) {
      return apiError("Enter valid working hours (HH:MM).");
    }
    updates.openTime = openTime;
    updates.closeTime = closeTime;
  }

  if (body.priceMin !== undefined || body.priceMax !== undefined) {
    const priceMin = Math.round(Number(body.priceMin ?? shop.priceMin));
    const priceMax = Math.round(Number(body.priceMax ?? shop.priceMax));
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin < 0 || priceMax < priceMin || priceMax > 1000000) {
      return apiError("Enter a valid price range.");
    }
    updates.priceMin = priceMin;
    updates.priceMax = priceMax;
  }

  if (body.shopName !== undefined) {
    const shopName = cleanText(body.shopName, 100);
    if (shopName.length < 3) return apiError("Shop name must be at least 3 characters.");
    updates.shopName = shopName;
  }

  if (body.ownerName !== undefined) {
    const ownerName = cleanText(body.ownerName, 80);
    if (ownerName.length < 2) return apiError("Owner name is required.");
    updates.ownerName = ownerName;
  }

  if (body.phone !== undefined) {
    const phone = cleanText(body.phone, 20);
    if (phone.replace(/\D/g, "").length < 10) return apiError("Enter a valid contact number.");
    updates.phone = phone;
  }

  if (body.shopPhone !== undefined) {
    updates.shopPhone = cleanText(body.shopPhone, 20);
  }

  if (body.address !== undefined) {
    const address = cleanText(body.address, 250);
    if (address.length < 8) return apiError("Address must be at least 8 characters.");
    updates.address = address;
  }

  if (body.city !== undefined) updates.city = cleanText(body.city, 80);
  if (body.pincode !== undefined) updates.pincode = cleanText(body.pincode, 10);

  if (body.latitude !== undefined && body.longitude !== undefined) {
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return apiError("Valid map coordinates required.");
    }
    updates.latitude = latitude;
    updates.longitude = longitude;
  }

  if (Array.isArray(body.vehicleTypes)) {
    const validTypes = ["2w", "4w", "truck", "bus"];
    const types = body.vehicleTypes.filter((item: unknown): item is string => typeof item === "string" && validTypes.includes(item));
    if (!types.length) return apiError("Select at least one vehicle type.");
    updates.vehicleTypes = types;
  }

  if (Array.isArray(body.specializations)) {
    const specs = body.specializations.filter((item: unknown): item is string => typeof item === "string" && item.length > 0).slice(0, 10);
    if (!specs.length) return apiError("Select at least one service offered.");
    updates.specializations = specs;
  }

  if (Array.isArray(body.spareParts)) {
    updates.spareParts = body.spareParts.filter((item: unknown): item is string => typeof item === "string" && item.length > 0).slice(0, 15);
  }

  if (body.isOnline !== undefined) {
    updates.isOnline = Boolean(body.isOnline);
    updates.availabilityStatus = body.isOnline ? "available" : "offline";
  }

  if (Array.isArray(body.workingDays)) {
    updates.workingDays = body.workingDays.filter((item: unknown): item is string => typeof item === "string").slice(0, 7);
  }

  if (Array.isArray(body.photos)) {
    const photos = body.photos.map(validImageUrl).filter((item: string | null): item is string => Boolean(item)).slice(0, 4);
    if (photos.length) updates.photos = photos;
  }

  const [updated] = await db.update(mechanics).set(updates).where(eq(mechanics.id, shop.id)).returning();
  return Response.json({ shop: updated });
}
