import { db, initDb } from "@/db";
import { breakdowns, mechanics, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { INITIAL_USERS, INITIAL_MECHANICS, INITIAL_BREAKDOWNS } from "@/db/initialData";
import { count } from "drizzle-orm";

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

      // Check if mechanics table is empty
      let totalMechanics = 0;
      try {
        const existingMechanics = await db.select({ value: count() }).from(mechanics);
        totalMechanics = Number(existingMechanics[0]?.value ?? 0);
      } catch (err) {
        console.warn("[SevaiGo Seed] Count mechanics note:", err);
      }

      if (totalMechanics === 0 && INITIAL_MECHANICS.length > 0) {
        // Seed users first so owner foreign keys match
        for (const u of INITIAL_USERS) {
          try {
            await db
              .insert(users)
              .values({
                id: u.id,
                name: u.name,
                email: u.email,
                passwordHash: u.password_hash,
                phone: u.phone ?? null,
                role: u.role,
                createdAt: new Date(u.created_at),
              })
              .onConflictDoNothing();
          } catch (e) {
            console.warn("[SevaiGo Seed] User insert skipped:", u.email, e);
          }
        }

        // Seed initial verified mechanics
        for (const m of INITIAL_MECHANICS) {
          try {
            await db
              .insert(mechanics)
              .values({
                id: m.id,
                slug: m.slug,
                ownerUserId: m.owner_user_id ?? null,
                shopName: m.shop_name,
                ownerName: m.owner_name,
                ownerPhoto: m.owner_photo || "/images/owner-1.jpg",
                phone: m.phone,
                address: m.address,
                city: m.city ?? null,
                pincode: m.pincode ?? null,
                shopPhone: m.shop_phone ?? null,
                latitude: Number(m.latitude),
                longitude: Number(m.longitude),
                vehicleTypes: m.vehicle_types ?? ["2w"],
                specializations: m.specializations ?? ["General service & Oil change"],
                workingDays: m.working_days ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                openTime: m.open_time || "08:00",
                closeTime: m.close_time || "21:00",
                rating: Number(m.rating || 0),
                reviewCount: Number(m.review_count || 0),
                photos: m.photos ?? ["/images/workshop-1.jpg"],
                isVerified: Boolean(m.is_verified),
                approvalStatus: m.approval_status || "approved",
                availabilityStatus: m.availability_status || "available",
                priceMin: Number(m.price_min || 250),
                priceMax: Number(m.price_max || 2500),
                yearsExperience: Number(m.years_experience || 3),
                businessDoc: m.business_doc ?? null,
                spareParts: m.spare_parts ?? null,
                isOnline: m.is_online ?? true,
                createdAt: new Date(m.created_at),
              })
              .onConflictDoNothing();
          } catch (e) {
            console.warn("[SevaiGo Seed] Mechanic insert skipped:", m.shop_name, e);
          }
        }

        // Seed initial breakdowns
        for (const b of INITIAL_BREAKDOWNS) {
          try {
            await db
              .insert(breakdowns)
              .values({
                id: b.id,
                userId: b.user_id ?? null,
                mechanicId: b.mechanic_id,
                issue: b.issue || "Roadside assistance",
                status: b.status || "pending",
                vehicleType: b.vehicle_type ?? null,
                userName: b.user_name ?? null,
                userPhone: b.user_phone ?? null,
                address: b.address ?? null,
                notes: b.notes ?? null,
                photoUrl: b.photo_url ?? null,
                spareParts: b.spare_parts ?? null,
                latitude: b.latitude ? Number(b.latitude) : null,
                longitude: b.longitude ? Number(b.longitude) : null,
                mechanicLat: b.mechanic_lat ? Number(b.mechanic_lat) : null,
                mechanicLng: b.mechanic_lng ? Number(b.mechanic_lng) : null,
                etaMinutes: b.eta_minutes ? Number(b.eta_minutes) : null,
                action: b.action || "called",
                createdAt: new Date(b.created_at),
                updatedAt: new Date(b.updated_at),
              })
              .onConflictDoNothing();
          } catch (e) {
            console.warn("[SevaiGo Seed] Breakdown insert skipped:", b.id, e);
          }
        }
      }
    })().catch((error) => {
      seedPromise = null;
      console.error("[SevaiGo Seed] Warning during database seed:", error);
    });
  }
  await seedPromise;
}
