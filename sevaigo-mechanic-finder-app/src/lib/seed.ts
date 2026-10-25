import { db, initDb } from "@/db";
import { breakdowns, mechanics, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { INITIAL_USERS, INITIAL_MECHANICS, INITIAL_BREAKDOWNS } from "@/db/initialData";
import { count, inArray } from "drizzle-orm";

let seedPromise: Promise<void> | null = null;

export async function ensureSeed() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await initDb();

      // Ensure admin exists
      const adminEmail = process.env.SEVAIGO_ADMIN_EMAIL?.trim().toLowerCase();
      const adminPassword = process.env.SEVAIGO_ADMIN_PASSWORD;
      if (adminEmail && adminPassword && adminPassword.length >= 8) {
        await db
          .insert(users)
          .values({
            name: "SevaiGo Admin",
            email: adminEmail,
            passwordHash: hashPassword(adminPassword),
            role: "admin",
          })
          .onConflictDoNothing();
      }

      // Clean up any legacy seeded fake mechanics to ensure zero fake shops
      try {
        if (INITIAL_MECHANICS && INITIAL_MECHANICS.length > 0) {
          const fakeMechIds = INITIAL_MECHANICS.map((m: any) => m.id);
          await db.delete(mechanics).where(inArray(mechanics.id, fakeMechIds)).catch(() => {});
        }
      } catch (err) {
        console.warn("[SevaiGo Seed] Fake mechanic cleanup note:", err);
      }

      // Clean up any legacy seeded fake demo breakdowns to ensure zero fake requests
      try {
        if (INITIAL_BREAKDOWNS && INITIAL_BREAKDOWNS.length > 0) {
          const fakeIds = INITIAL_BREAKDOWNS.map((b: any) => b.id);
          await db.delete(breakdowns).where(inArray(breakdowns.id, fakeIds)).catch(() => {});
        }
      } catch {}
    })().catch((error) => {
      seedPromise = null;
      console.error("[SevaiGo Seed] Warning during database seed:", error);
    });
  }
  await seedPromise;
}
