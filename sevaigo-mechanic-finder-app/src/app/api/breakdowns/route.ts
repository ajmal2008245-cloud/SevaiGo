import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { breakdowns, mechanics, notifications } from "@/db/schema";
import { apiError, cleanText } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const requestId = url.searchParams.get("id");

  // Single request lookup for live tracking
  if (requestId && /^[0-9a-f-]{36}$/i.test(requestId)) {
    const [item] = await db.select({
      id: breakdowns.id,
      mechanicId: breakdowns.mechanicId,
      shopName: mechanics.shopName,
      shopPhone: mechanics.phone,
      shopAddress: mechanics.address,
      action: breakdowns.action,
      issue: breakdowns.issue,
      status: breakdowns.status,
      vehicleType: breakdowns.vehicleType,
      userName: breakdowns.userName,
      userPhone: breakdowns.userPhone,
      address: breakdowns.address,
      notes: breakdowns.notes,
      photoUrl: breakdowns.photoUrl,
      spareParts: breakdowns.spareParts,
      latitude: breakdowns.latitude,
      longitude: breakdowns.longitude,
      mechanicLat: breakdowns.mechanicLat,
      mechanicLng: breakdowns.mechanicLng,
      etaMinutes: breakdowns.etaMinutes,
      createdAt: breakdowns.createdAt,
      updatedAt: breakdowns.updatedAt,
    }).from(breakdowns)
      .innerJoin(mechanics, eq(breakdowns.mechanicId, mechanics.id))
      .where(eq(breakdowns.id, requestId))
      .limit(1);

    if (!item) return apiError("Rescue request not found.", 404);
    return Response.json({ breakdown: item });
  }

  if (mode === "incoming") {
    // Mechanic checking requests for their workshop
    if (!user) return apiError("Please sign in.", 401);
    const [shop] = await db.select().from(mechanics).where(eq(mechanics.ownerUserId, user.id)).limit(1);
    if (!shop) return Response.json({ breakdowns: [] });

    const items = await db.select({
      id: breakdowns.id,
      mechanicId: breakdowns.mechanicId,
      shopName: mechanics.shopName,
      action: breakdowns.action,
      issue: breakdowns.issue,
      status: breakdowns.status,
      vehicleType: breakdowns.vehicleType,
      userName: breakdowns.userName,
      userPhone: breakdowns.userPhone,
      address: breakdowns.address,
      notes: breakdowns.notes,
      photoUrl: breakdowns.photoUrl,
      spareParts: breakdowns.spareParts,
      latitude: breakdowns.latitude,
      longitude: breakdowns.longitude,
      mechanicLat: breakdowns.mechanicLat,
      mechanicLng: breakdowns.mechanicLng,
      etaMinutes: breakdowns.etaMinutes,
      createdAt: breakdowns.createdAt,
      updatedAt: breakdowns.updatedAt,
    }).from(breakdowns)
      .innerJoin(mechanics, eq(breakdowns.mechanicId, mechanics.id))
      .where(eq(breakdowns.mechanicId, shop.id))
      .orderBy(desc(breakdowns.createdAt))
      .limit(50);

    return Response.json({ breakdowns: items, shop });
  }

  // Vehicle owner viewing their own past/active activity
  if (!user) {
    return Response.json({ breakdowns: [] });
  }

  const items = await db.select({
    id: breakdowns.id,
    mechanicId: breakdowns.mechanicId,
    shopName: mechanics.shopName,
    shopPhone: mechanics.phone,
    shopAddress: mechanics.address,
    action: breakdowns.action,
    issue: breakdowns.issue,
    status: breakdowns.status,
    vehicleType: breakdowns.vehicleType,
    notes: breakdowns.notes,
    photoUrl: breakdowns.photoUrl,
    spareParts: breakdowns.spareParts,
    latitude: breakdowns.latitude,
    longitude: breakdowns.longitude,
    mechanicLat: breakdowns.mechanicLat,
    mechanicLng: breakdowns.mechanicLng,
    etaMinutes: breakdowns.etaMinutes,
    createdAt: breakdowns.createdAt,
    updatedAt: breakdowns.updatedAt,
  }).from(breakdowns)
    .innerJoin(mechanics, eq(breakdowns.mechanicId, mechanics.id))
    .where(eq(breakdowns.userId, user.id))
    .orderBy(desc(breakdowns.createdAt))
    .limit(50);

  return Response.json({ breakdowns: items });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const mechanicId = typeof body?.mechanicId === "string" ? body.mechanicId : "";
  if (!/^[0-9a-f-]{36}$/i.test(mechanicId)) return apiError("Invalid workshop.");

  const [shop] = await db.select().from(mechanics).where(eq(mechanics.id, mechanicId)).limit(1);
  if (!shop) return apiError("Workshop not found.", 404);

  const user = await getSessionUser();
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  const action = body.action === "navigate" ? "navigated" : body.action === "request" ? "requested" : "called";
  const issue = cleanText(body.issue, 120) || "Roadside assistance";
  const vehicleType = cleanText(body.vehicleType, 50) || "2w";
  const userName = cleanText(body.userName || user?.name || "Rider in Need", 80);
  const userPhone = cleanText(body.userPhone || user?.phone || "", 20);
  const address = cleanText(body.address, 250) || null;
  const notes = cleanText(body.notes, 500) || null;
  const photoUrl = typeof body.photoUrl === "string" && body.photoUrl.length > 5 ? body.photoUrl : null;
  const spareParts = Array.isArray(body.spareParts) ? body.spareParts.filter((p: unknown): p is string => typeof p === "string") : null;

  const [record] = await db.insert(breakdowns).values({
    userId: user?.id || null,
    mechanicId,
    action,
    status: action === "requested" ? "pending" : "completed",
    issue,
    vehicleType,
    userName,
    userPhone,
    address,
    notes,
    photoUrl,
    spareParts,
    latitude: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
    longitude: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null,
  }).returning();

  // If request is made and workshop has an owner, notify the shop owner
  if (action === "requested" && shop.ownerUserId) {
    await db.insert(notifications).values({
      userId: shop.ownerUserId,
      title: "🚨 New Rescue Request",
      message: `${userName} requested assistance for ${vehicleType.toUpperCase()} (${issue}). Contact: ${userPhone || "Not provided"}.`,
    });
  }

  return Response.json({
    success: true,
    breakdown: record,
    message: action === "requested" ? "Rescue assistance request sent to mechanic." : "Activity logged.",
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const rawStatus = typeof body?.status === "string" ? cleanText(body.status, 25).toLowerCase() : "";

  const allowedStatuses = [
    "pending",
    "requested",
    "accepted",
    "arriving",
    "on_the_way",
    "arrived",
    "repairing",
    "in_progress",
    "fixed",
    "completed",
    "declined",
    "cancelled",
  ];

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("Invalid rescue request ID.");
  }

  const [requestRow] = await db.select().from(breakdowns).where(eq(breakdowns.id, id)).limit(1);
  if (!requestRow) return apiError("Rescue request not found.", 404);

  const user = await getSessionUser();
  let isShopOwner = false;
  let shop: any = null;

  if (!user) {
    // Allow guest user who dispatched the request to cancel it
    if (rawStatus !== "cancelled" || requestRow.userId !== null) {
      return apiError("Please sign in.");
    }
  } else {
    // Check authorization: user must be the shop owner or the user who created it
    const [foundShop] = await db.select().from(mechanics).where(eq(mechanics.id, requestRow.mechanicId)).limit(1);
    shop = foundShop;
    isShopOwner = Boolean(shop && shop.ownerUserId === user.id);
    const isRequestCreator = requestRow.userId === user.id;

    if (!isShopOwner && !isRequestCreator) {
      return apiError("You do not have permission to update this rescue request.", 403);
    }
  }

  const updateData: Partial<typeof breakdowns.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (rawStatus && allowedStatuses.includes(rawStatus)) {
    updateData.status = rawStatus;
    // Stop live location sharing if request ends or is cancelled
    if (["completed", "fixed", "cancelled", "declined"].includes(rawStatus)) {
      updateData.mechanicLat = null;
      updateData.mechanicLng = null;
      updateData.etaMinutes = null;
    }
  }

  // Mechanic live GPS updates during active request
  if (isShopOwner && body.mechanicLat !== undefined && body.mechanicLng !== undefined) {
    const mLat = Number(body.mechanicLat);
    const mLng = Number(body.mechanicLng);
    if (Number.isFinite(mLat) && Number.isFinite(mLng)) {
      updateData.mechanicLat = mLat;
      updateData.mechanicLng = mLng;

      // Compute reliable ETA if customer coordinates are known
      if (requestRow.latitude && requestRow.longitude) {
        const radVal = Math.PI / 180;
        const dLat = (requestRow.latitude - mLat) * radVal;
        const dLon = (requestRow.longitude - mLng) * radVal;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(mLat * radVal) *
            Math.cos(requestRow.latitude * radVal) *
            Math.sin(dLon / 2) ** 2;
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        updateData.etaMinutes = Math.max(2, Math.round(distKm * 3.2 + 2));
      }
    }
  }

  const [updated] = await db.update(breakdowns).set(updateData).where(eq(breakdowns.id, id)).returning();

  // Notify vehicle owner if mechanic updated status
  if (isShopOwner && requestRow.userId && rawStatus) {
    let title = "🚨 Rescue Status Update";
    let statusMsg = `${shop.shopName} updated your rescue request to: ${rawStatus}`;

    if (rawStatus === "accepted") {
      title = "✅ Rescue Request Accepted";
      statusMsg = `${shop.shopName} has accepted your rescue request and is preparing the toolkit!`;
    } else if (rawStatus === "arriving" || rawStatus === "on_the_way") {
      title = "🛵 Mechanic On The Way";
      statusMsg = `${shop.shopName} mechanic is on the way to your location (ETA ~${updated.etaMinutes || 10} mins).`;
    } else if (rawStatus === "arrived") {
      title = "📍 Mechanic Arrived";
      statusMsg = `${shop.shopName} mechanic has arrived at your breakdown location!`;
    } else if (rawStatus === "repairing" || rawStatus === "in_progress") {
      title = "🔧 Repair In Progress";
      statusMsg = `${shop.shopName} is now fixing your motorcycle.`;
    } else if (rawStatus === "fixed" || rawStatus === "completed") {
      title = "🏁 Vehicle Repaired";
      statusMsg = `${shop.shopName} completed the repair. Your motorcycle is ready to ride!`;
    } else if (rawStatus === "declined") {
      title = "❌ Rescue Request Declined";
      statusMsg = `${shop.shopName} is currently unavailable. Please connect with another nearby workshop.`;
    }

    await db.insert(notifications).values({
      userId: requestRow.userId,
      title,
      message: statusMsg,
    });
  }

  return Response.json({ success: true, breakdown: updated });
}
