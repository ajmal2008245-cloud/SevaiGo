import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics, reviews, users } from "@/db/schema";
import { apiError, cleanText } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id);

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!validId(id)) return apiError("Invalid workshop.");
  const items = await db.select({
    id: reviews.id,
    name: users.name,
    rating: reviews.rating,
    comment: reviews.comment,
    createdAt: reviews.createdAt,
  }).from(reviews).innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.mechanicId, id)).orderBy(desc(reviews.createdAt)).limit(30);
  return Response.json({ reviews: items });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) return apiError("Please sign in to leave a review.", 401);
  const { id } = await params;
  if (!validId(id)) return apiError("Invalid workshop.");
  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = cleanText(body?.comment, 500);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3) return apiError("Choose a rating and write a short review.");

  const result = await db.transaction(async (tx: any) => {
    const [shop] = await tx.select().from(mechanics).where(and(eq(mechanics.id, id), eq(mechanics.isVerified, true))).limit(1);
    if (!shop) return null;
    const [existing] = await tx.select().from(reviews).where(and(eq(reviews.userId, user.id), eq(reviews.mechanicId, id))).limit(1);
    if (existing) {
      await tx.update(reviews).set({ rating, comment, createdAt: new Date() }).where(eq(reviews.id, existing.id));
    } else {
      await tx.insert(reviews).values({ mechanicId: id, userId: user.id, rating, comment });
    }
    const count = shop.reviewCount + (existing ? 0 : 1);
    const newRating = Math.round(((shop.rating * shop.reviewCount - (existing?.rating || 0) + rating) / count) * 10) / 10;
    await tx.update(mechanics).set({ rating: newRating, reviewCount: count }).where(eq(mechanics.id, id));
    return { rating: newRating, reviewCount: count };
  });
  if (!result) return apiError("Workshop not found.", 404);
  return Response.json({ success: true, ...result });
}
