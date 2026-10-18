import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites, mechanics } from "@/db/schema";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { DEMO_LOCATION, toMechanicView } from "@/lib/mechanics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in to view saved workshops.", 401);
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const latitude = Number.isFinite(lat) && lat >= -90 && lat <= 90 && params.has("lat") ? lat : DEMO_LOCATION.latitude;
  const longitude = Number.isFinite(lng) && lng >= -180 && lng <= 180 && params.has("lng") ? lng : DEMO_LOCATION.longitude;
  const rows = await db.select().from(favorites).innerJoin(mechanics, eq(favorites.mechanicId, mechanics.id)).where(eq(favorites.userId, user.id));
  return Response.json({
    ids: rows.map((row: any) => row.favorites.mechanicId),
    shops: rows.map((row: any) => toMechanicView(row.mechanics, latitude, longitude)),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in to save workshops.", 401);
  const body = await request.json().catch(() => null);
  const mechanicId = typeof body?.mechanicId === "string" ? body.mechanicId : "";
  if (!/^[0-9a-f-]{36}$/i.test(mechanicId)) return apiError("Invalid workshop.");
  const [shop] = await db.select({ id: mechanics.id }).from(mechanics).where(and(eq(mechanics.id, mechanicId), eq(mechanics.isVerified, true))).limit(1);
  if (!shop) return apiError("Workshop not found.", 404);
  if (body.favorite === false) {
    await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.mechanicId, mechanicId)));
  } else {
    await db.insert(favorites).values({ userId: user.id, mechanicId }).onConflictDoNothing();
  }
  return Response.json({ success: true, favorite: body.favorite !== false });
}
