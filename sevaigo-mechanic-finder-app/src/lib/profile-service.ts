import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "customer" | "mechanic";

export type ProfileData = {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Clean phone to standardized 10-digit format
 */
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Fetch or securely initialize a profile in Supabase `profiles` table.
 * Enforces role security:
 * - If profile exists in Supabase, the stored role CANNOT be changed by the user.
 * - If profile is new, it is registered with the specified role ("customer" | "mechanic").
 */
export async function getOrVerifyProfile(
  rawPhone: string,
  preferredName?: string,
  requestedRole: UserRole = "customer"
): Promise<ProfileData> {
  const phone = sanitizePhone(rawPhone);
  const defaultName = preferredName?.trim() || (requestedRole === "mechanic" ? `Mechanic ${phone.slice(-4)}` : `Rider ${phone.slice(-4)}`);

  // Default fallback profile in case of any database latency
  let profile: ProfileData = {
    id: `prof-${phone}`,
    phone,
    name: defaultName,
    role: requestedRole === "mechanic" ? "mechanic" : "customer",
  };

  // 1. Check Supabase `profiles` table
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (!error && data) {
      // Existing profile found: Authoritative role from Supabase is enforced!
      // User CANNOT override their registered role.
      profile = {
        id: data.id,
        phone: data.phone,
        name: data.name || defaultName,
        role: data.role === "mechanic" ? "mechanic" : "customer",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      console.log(`[ProfileService] Verified existing profile for ${phone}: Role is "${profile.role}"`);
    } else {
      // New profile: Insert into Supabase `profiles`
      const newRole: UserRole = requestedRole === "mechanic" ? "mechanic" : "customer";
      const { data: inserted, error: insertErr } = await supabase
        .from("profiles")
        .insert({
          phone,
          name: defaultName,
          role: newRole,
        })
        .select()
        .maybeSingle();

      if (!insertErr && inserted) {
        profile = {
          id: inserted.id,
          phone: inserted.phone,
          name: inserted.name,
          role: inserted.role as UserRole,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        };
        console.log(`[ProfileService] Registered new profile for ${phone}: Role set to "${profile.role}"`);
      } else if (insertErr) {
        console.warn("[ProfileService] Supabase profiles insert notice:", insertErr.message);
      }
    }
  } catch (supaErr: any) {
    console.warn("[ProfileService] Supabase profiles query notice (using local fallback):", supaErr?.message);
  }

  // 2. Synchronize with local `users` table for session persistence
  try {
    const userEmail = `${phone}@sevaigo.local`;
    const [existingLocal] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (existingLocal) {
      // If Supabase profile table is still pending migration, enforce role from local DB
      if (!profile.createdAt && existingLocal.role) {
        profile.role = existingLocal.role === "mechanic" ? "mechanic" : "customer";
        profile.name = existingLocal.name || profile.name;
      }
      // Keep local user updated with verified role
      await db
        .update(users)
        .set({
          name: profile.name,
          role: profile.role,
        })
        .where(eq(users.id, existingLocal.id));
    } else {
      // Create local user record
      await db.insert(users).values({
        name: profile.name,
        email: userEmail,
        phone,
        role: profile.role,
        passwordHash: "otp_authenticated",
      }).catch(() => {});
    }
  } catch (localDbErr: any) {
    console.warn("[ProfileService] Local DB sync note:", localDbErr?.message);
  }

  return profile;
}
