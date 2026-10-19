import { getOrVerifyProfile, sanitizePhone, type UserRole } from "@/lib/profile-service";
import { createSession, getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneParam = searchParams.get("phone");

    const sessionUser = await getSessionUser().catch(() => null);
    const phone = phoneParam ? sanitizePhone(phoneParam) : (sessionUser?.phone ? sanitizePhone(sessionUser.phone) : null);

    if (!phone) {
      return Response.json({ success: false, error: "Phone number required." }, { status: 400 });
    }

    const profile = await getOrVerifyProfile(phone, sessionUser?.name);
    return Response.json({ success: true, profile });
  } catch (err: any) {
    return Response.json({ success: false, error: err?.message || "Failed to fetch profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ success: false, error: "Invalid request payload." }, { status: 400 });
    }

    const phone = sanitizePhone(body.phone || "");
    if (phone.length < 10) {
      return Response.json({ success: false, error: "Valid 10-digit phone number is required." }, { status: 400 });
    }

    const requestedRole: UserRole = body.role === "mechanic" ? "mechanic" : "customer";
    const name = body.name ? String(body.name).trim() : undefined;

    // Secure verification: checks Supabase profiles table
    // If profile exists in Supabase, the stored role CANNOT be changed by the user!
    const profile = await getOrVerifyProfile(phone, name, requestedRole);

    // Create session cookie
    try {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
      if (u) {
        await createSession(u.id);
      }
    } catch (e: any) {
      console.warn("[Profile API] Session creation note:", e?.message);
    }

    return Response.json({
      success: true,
      profile,
      message: `Signed in as ${profile.role === "mechanic" ? "Mechanic" : "Customer"}.`,
    });
  } catch (err: any) {
    console.error("[Profile API] POST error:", err);
    return Response.json({ success: false, error: err?.message || "Failed to verify profile." }, { status: 500 });
  }
}
