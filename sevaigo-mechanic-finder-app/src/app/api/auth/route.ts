import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, cleanText } from "@/lib/api";
import { createSession, destroySession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ user: await getSessionUser() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError("Invalid request.");

  if (body.action === "logout") {
    await destroySession();
    return Response.json({ user: null });
  }

  const email = cleanText(body.email, 254).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Enter a valid email address.");
  if (password.length < 6) return apiError("Password must have at least 6 characters.");

  if (body.action === "register") {
    const name = cleanText(body.name, 80);
    if (name.length < 2) return apiError("Enter your name.");
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return apiError("An account with this email already exists.", 409);
    try {
      const [user] = await db.insert(users).values({
        name, email, passwordHash: hashPassword(password), phone: cleanText(body.phone, 20) || null,
      }).returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role });
      await createSession(user.id);
      return Response.json({ user }, { status: 201 });
    } catch {
      return apiError("Could not create account. Please try again.", 409);
    }
  }

  if (body.action === "login") {
    await ensureSeed();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) return apiError("Incorrect email or password.", 401);
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  }

  return apiError("Unknown action.");
}
