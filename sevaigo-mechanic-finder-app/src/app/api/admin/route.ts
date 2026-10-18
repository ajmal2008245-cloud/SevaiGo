import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics, notifications } from "@/db/schema";
import { apiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return apiError("Admin access required.", 403);
  const shops = await db.select().from(mechanics).where(eq(mechanics.approvalStatus, "pending")).orderBy(desc(mechanics.createdAt));
  return Response.json({ shops });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return apiError("Admin access required.", 403);
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected"].includes(status)) return apiError("Invalid approval request.");
  const [shop] = await db.update(mechanics).set({
    approvalStatus: status,
    isVerified: status === "approved",
  }).where(eq(mechanics.id, id)).returning();
  if (!shop) return apiError("Workshop not found.", 404);
  if (shop.ownerUserId) {
    await db.insert(notifications).values({
      userId: shop.ownerUserId,
      title: status === "approved" ? "Your workshop is live!" : "Workshop application update",
      message: status === "approved"
        ? `${shop.shopName} is approved and visible to travelers nearby.`
        : `${shop.shopName} wasn't approved this time. Please contact support for help.`,
    });
  }
  return Response.json({ success: true, shop: { id: shop.id, approvalStatus: shop.approvalStatus } });
}
