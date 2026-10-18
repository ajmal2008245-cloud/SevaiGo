import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { apiError, cleanText } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in to view your vehicles.", 401);
  const items = await db.select().from(vehicles).where(eq(vehicles.userId, user.id)).orderBy(desc(vehicles.createdAt));
  return Response.json({ vehicles: items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in to add a vehicle.", 401);
  const body = await request.json().catch(() => null);
  const make = cleanText(body?.make, 60);
  const model = cleanText(body?.model, 60);
  const registration = cleanText(body?.registration, 25);
  const year = Number(body?.year);
  const type = cleanText(body?.type, 10);
  if (!make || !model || !Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1 || !["2w", "4w", "truck", "bus"].includes(type)) {
    return apiError("Enter a valid make, model, year and vehicle type.");
  }
  const [vehicle] = await db.insert(vehicles).values({ userId: user.id, make, model, year, type, registration: registration || null }).returning();
  return Response.json({ vehicle }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in.", 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError("Invalid vehicle.");
  const rows = await db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.userId, user.id))).returning({ id: vehicles.id });
  if (!rows.length) return apiError("Vehicle not found.", 404);
  return Response.json({ success: true });
}
