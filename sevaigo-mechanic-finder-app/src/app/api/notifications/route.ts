import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in.", 401);
  const items = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
  return Response.json({ notifications: items });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in.", 401);
  const body = await request.json().catch(() => null);
  if (body?.id && typeof body.id === "string") {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, user.id), eq(notifications.id, body.id)));
  } else {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  }
  return Response.json({ success: true });
}
