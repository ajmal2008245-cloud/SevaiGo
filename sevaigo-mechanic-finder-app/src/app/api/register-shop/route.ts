import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { mechanics, users } from "@/db/schema";
import { cleanText, validImageUrl } from "@/lib/api";
import { createSession, getSessionUser, hashPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { getOrVerifyProfile } from "@/lib/profile-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    const sessionUser = await getSessionUser().catch(() => null);
    const targetPhone = phone || sessionUser?.phone;

    if (!targetPhone) {
      return Response.json({ success: true, shop: null, status: "NOT_REGISTERED" });
    }

    const cleanDigits = targetPhone.replace(/\D/g, "");

    // 1. Primary: Check local database mechanics table
    try {
      const localShops = await db.select().from(mechanics).limit(100);
      const matchedLocal = localShops.find((m: any) => {
        const p = (m.phone || m.shopPhone || "").replace(/\D/g, "");
        const ownerMatch = sessionUser && m.ownerUserId === sessionUser.id;
        return (
          ownerMatch ||
          p === cleanDigits ||
          (cleanDigits.length >= 10 && p.endsWith(cleanDigits.slice(-10))) ||
          (p.length >= 10 && cleanDigits.endsWith(p.slice(-10)))
        );
      });

      if (matchedLocal) {
        const rawStatus = (matchedLocal.approvalStatus || "pending").toLowerCase();
        const normalizedStatus =
          rawStatus === "approved"
            ? "APPROVED"
            : rawStatus === "rejected"
            ? "REJECTED"
            : "PENDING_VERIFICATION";

        return Response.json({
          success: true,
          status: normalizedStatus,
          shop: {
            id: matchedLocal.id,
            shop_name: matchedLocal.shopName,
            shopName: matchedLocal.shopName,
            owner_name: matchedLocal.ownerName,
            ownerName: matchedLocal.ownerName,
            phone: matchedLocal.shopPhone || matchedLocal.phone,
            shopPhone: matchedLocal.shopPhone || matchedLocal.phone,
            address: matchedLocal.address,
            city: matchedLocal.city || "",
            pincode: matchedLocal.pincode || "",
            lat: matchedLocal.latitude,
            latitude: matchedLocal.latitude,
            lng: matchedLocal.longitude,
            longitude: matchedLocal.longitude,
            services: matchedLocal.specializations || [],
            specializations: matchedLocal.specializations || [],
            vehicleTypes: matchedLocal.vehicleTypes || ["2w", "4w"],
            workingDays: matchedLocal.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            openTime: matchedLocal.openTime || "08:00",
            closeTime: matchedLocal.closeTime || "21:00",
            priceMin: matchedLocal.priceMin || 300,
            priceMax: matchedLocal.priceMax || 2500,
            yearsExperience: matchedLocal.yearsExperience || 5,
            photos: matchedLocal.photos || ["/images/workshop-1.jpg"],
            approvalStatus: matchedLocal.approvalStatus || "pending",
            isVerified: matchedLocal.isVerified ?? false,
            availabilityStatus: matchedLocal.availabilityStatus || "available",
          },
        });
      }
    } catch (localErr: any) {
      console.warn("[RegisterShop API] Local DB query note:", localErr?.message);
    }

    // 2. Fallback: Check Supabase shops table
    try {
      const supaPromise = supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Supabase query timeout") }), 3000)
      );

      const { data } = await Promise.race([supaPromise, timeoutPromise]);

      if (data && Array.isArray(data)) {
        const matched = data.find((s: any) => {
          const p = (s.phone || "").replace(/\D/g, "");
          return (
            p === cleanDigits ||
            (cleanDigits.length >= 10 && p.endsWith(cleanDigits.slice(-10))) ||
            (p.length >= 10 && cleanDigits.endsWith(p.slice(-10)))
          );
        });

        if (matched) {
          const isVer = Boolean(matched.verified);
          return Response.json({
            success: true,
            status: isVer ? "APPROVED" : "PENDING_VERIFICATION",
            shop: {
              id: matched.id,
              shop_name: matched.shop_name,
              shopName: matched.shop_name,
              owner_name: matched.owner_name,
              ownerName: matched.owner_name,
              phone: matched.phone,
              shopPhone: matched.phone,
              address: matched.address,
              city: matched.city || "",
              pincode: matched.pincode || "",
              lat: Number(matched.lat),
              latitude: Number(matched.lat),
              lng: Number(matched.lng),
              longitude: Number(matched.lng),
              services: matched.services || [],
              specializations: matched.services || [],
              vehicleTypes: ["2w", "4w"],
              openTime: "08:00",
              closeTime: "21:00",
              photos: ["/images/workshop-1.jpg"],
              approvalStatus: isVer ? "approved" : "pending",
              isVerified: isVer,
              availabilityStatus: "available",
            },
          });
        }
      }
    } catch (supaErr: any) {
      console.warn("[RegisterShop API] Supabase query note:", supaErr?.message);
    }

    return Response.json({ success: true, shop: null, status: "NOT_REGISTERED" });
  } catch (err: any) {
    console.error("[RegisterShop API] GET error:", err?.message);
    return Response.json({ success: true, shop: null, status: "NOT_REGISTERED" });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ success: false, error: "Invalid registration payload." }, { status: 400 });
    }

    // Sanitize & validate fields
    const shopName = cleanText(body.shopName, 120);
    const ownerName = cleanText(body.ownerName, 80);
    const phone = cleanText(body.phone, 20);
    const shopPhone = cleanText(body.shopPhone, 20) || phone;
    const address = cleanText(body.address, 250);
    const city = cleanText(body.city, 80) || "Chennai";
    const pincode = cleanText(body.pincode, 10);
    const email = cleanText(body.email, 120);
    const password = typeof body.password === "string" ? body.password : "";
    const latitude = Number(body.latitude !== undefined ? body.latitude : body.lat);
    const longitude = Number(body.longitude !== undefined ? body.longitude : body.lng);

    // Strict validation
    if (shopName.length < 3) {
      return Response.json({ success: false, error: "Shop name must be at least 3 characters long." }, { status: 400 });
    }
    if (ownerName.length < 2) {
      return Response.json({ success: false, error: "Owner full name is required." }, { status: 400 });
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return Response.json({ success: false, error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }
    if (address.length < 6) {
      return Response.json({ success: false, error: "Please provide a complete shop street address." }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return Response.json({ success: false, error: "Please pick your workshop location on the map." }, { status: 400 });
    }

    const fullAddress = address.trim() + (city ? `, ${city}` : "") + (pincode ? ` - ${pincode}` : "");
    const vehicleTypes: string[] = Array.isArray(body.vehicleTypes) && body.vehicleTypes.length > 0 ? body.vehicleTypes : ["2w", "4w"];
    const specializations: string[] = Array.isArray(body.specializations) && body.specializations.length > 0 ? body.specializations : ["General service & Oil change"];
    const workingDays: string[] = Array.isArray(body.workingDays) && body.workingDays.length > 0 ? body.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const openTime = cleanText(body.openTime, 5) || "08:00";
    const closeTime = cleanText(body.closeTime, 5) || "21:00";
    const priceMin = Math.max(0, Math.round(Number(body.priceMin) || 300));
    const priceMax = Math.max(priceMin, Math.round(Number(body.priceMax) || 2500));
    const yearsExperience = Math.max(0, Math.round(Number(body.yearsExperience) || 5));
    const spareParts: string[] = Array.isArray(body.spareParts) ? body.spareParts : [];
    const businessDoc = cleanText(body.businessDoc, 250) || undefined;

    // Process photo: accepts URL, relative path, or Base64 data URI
    const rawPhotos: string[] = Array.isArray(body.photos) && body.photos.length > 0
      ? body.photos
      : typeof body.workshopPhotoUrl === "string" && body.workshopPhotoUrl.trim()
      ? [body.workshopPhotoUrl.trim()]
      : typeof body.shopPhotoPreview === "string" && body.shopPhotoPreview.trim()
      ? [body.shopPhotoPreview.trim()]
      : [];

    const processedPhotos = rawPhotos
      .map(validImageUrl)
      .filter((p: string | null): p is string => Boolean(p));

    const finalPhotos = processedPhotos.length > 0 ? processedPhotos : ["/images/workshop-1.jpg"];

    // 1. Session & User Management
    let activeUserId: string | null = null;
    const currentSessionUser = await getSessionUser().catch(() => null);

    if (currentSessionUser) {
      activeUserId = currentSessionUser.id;
      // Upgrade user role to mechanic
      try {
        await db.update(users).set({ role: "mechanic" }).where(eq(users.id, activeUserId));
      } catch {}
    } else {
      try {
        const userEmail = email && email.includes("@") ? email.toLowerCase() : `owner_${cleanPhone.slice(-10)}@sevaigo.local`;
        const [existingUser] = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);

        if (existingUser) {
          activeUserId = existingUser.id;
          await db.update(users).set({ role: "mechanic", phone: cleanPhone }).where(eq(users.id, existingUser.id));
        } else {
          const userPassword = password && password.length >= 6 ? password : `SevaiGo_${cleanPhone.slice(-6)}`;
          const [newUser] = await db
            .insert(users)
            .values({
              name: ownerName,
              email: userEmail,
              phone: cleanPhone,
              passwordHash: hashPassword(userPassword),
              role: "mechanic",
            })
            .returning();
          activeUserId = newUser.id;
        }

        if (activeUserId) {
          await createSession(activeUserId).catch(() => {});
        }
        await getOrVerifyProfile(cleanPhone, ownerName, "mechanic").catch(() => {});
      } catch (authErr: any) {
        console.warn("[RegisterShop API] Auth session handling note:", authErr?.message);
      }
    }

    // 2. Primary: Save to Local PostgreSQL/PGlite Database (Source of Truth)
    let savedMechanicRecord: any = null;

    try {
      const cleanOwnerUserId = activeUserId || undefined;
      // Check if workshop already exists by owner or phone
      const localShops = await db.select().from(mechanics).limit(100);
      const existingShop = localShops.find((m: any) => {
        const p = (m.phone || m.shopPhone || "").replace(/\D/g, "");
        const ownerMatch = cleanOwnerUserId && m.ownerUserId === cleanOwnerUserId;
        return (
          ownerMatch ||
          p === cleanPhone ||
          (cleanPhone.length >= 10 && p.endsWith(cleanPhone.slice(-10)))
        );
      });

      if (existingShop) {
        // Update existing shop application
        const [updated] = await db
          .update(mechanics)
          .set({
            shopName,
            ownerName,
            ownerPhoto: finalPhotos[0] || "/images/owner-1.jpg",
            phone: cleanPhone,
            shopPhone: (shopPhone || phone).trim(),
            address: fullAddress,
            city,
            pincode,
            latitude,
            longitude,
            vehicleTypes,
            specializations,
            workingDays,
            openTime,
            closeTime,
            photos: finalPhotos,
            isVerified: false,
            approvalStatus: "pending",
            availabilityStatus: "available",
            priceMin,
            priceMax,
            yearsExperience,
            spareParts,
            businessDoc,
          })
          .where(eq(mechanics.id, existingShop.id))
          .returning();
        savedMechanicRecord = updated;
      } else {
        // Insert new shop application
        const slug = `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${randomBytes(3).toString("hex")}`;
        const [inserted] = await db
          .insert(mechanics)
          .values({
            slug,
            ownerUserId: cleanOwnerUserId,
            shopName,
            ownerName,
            ownerPhoto: finalPhotos[0] || "/images/owner-1.jpg",
            phone: cleanPhone,
            shopPhone: (shopPhone || phone).trim(),
            address: fullAddress,
            city,
            pincode,
            latitude,
            longitude,
            vehicleTypes,
            specializations,
            workingDays,
            openTime,
            closeTime,
            photos: finalPhotos,
            isVerified: false,
            approvalStatus: "pending",
            availabilityStatus: "available",
            priceMin,
            priceMax,
            yearsExperience,
            spareParts,
            businessDoc,
          })
          .returning();
        savedMechanicRecord = inserted;
      }
    } catch (dbErr: any) {
      console.error("[RegisterShop API] Local DB persistence error:", dbErr?.message);
      return Response.json(
        {
          success: false,
          error: `Could not save workshop to database: ${dbErr?.message || "Internal database error"}. Please try again.`,
        },
        { status: 500 }
      );
    }

    if (!savedMechanicRecord) {
      return Response.json(
        { success: false, error: "Database failed to return the registered workshop record." },
        { status: 500 }
      );
    }

    console.log(`[RegisterShop API] Successfully saved to primary database: ${shopName} (ID: ${savedMechanicRecord.id})`);

    // 3. Secondary: Sync to Supabase shops table (non-blocking fallback)
    try {
      const servicesList = Array.from(new Set([...vehicleTypes, ...specializations]));
      const sparePartsTags = spareParts.map((p: string) => "spare:" + p);
      const servicesWithSpares = Array.from(new Set([...servicesList, ...sparePartsTags]));

      const { data: existingSupaShop } = await supabase
        .from("shops")
        .select("id")
        .eq("phone", shopPhone || phone)
        .maybeSingle();

      if (existingSupaShop?.id) {
        await supabase
          .from("shops")
          .update({
            shop_name: shopName,
            owner_name: ownerName,
            address: fullAddress,
            lat: latitude,
            lng: longitude,
            services: servicesWithSpares,
            verified: false,
          })
          .eq("id", existingSupaShop.id);
      } else {
        await supabase.from("shops").insert({
          id: savedMechanicRecord.id,
          shop_name: shopName,
          owner_name: ownerName,
          phone: shopPhone || phone,
          address: fullAddress,
          lat: latitude,
          lng: longitude,
          services: servicesWithSpares,
          verified: false,
        });
      }

      // Also track owner in Supabase users table
      const { data: existingSupaUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (!existingSupaUser) {
        await supabase.from("users").insert({ phone: cleanPhone, name: ownerName });
      }
    } catch (supaErr: any) {
      console.warn("[RegisterShop API] Supabase sync note (local DB intact):", supaErr?.message);
    }

    return Response.json({
      success: true,
      message: "Workshop registered successfully! Your application is submitted for verification.",
      status: "PENDING_VERIFICATION",
      shop: {
        id: savedMechanicRecord.id,
        shop_name: savedMechanicRecord.shopName,
        shopName: savedMechanicRecord.shopName,
        owner_name: savedMechanicRecord.ownerName,
        ownerName: savedMechanicRecord.ownerName,
        phone: savedMechanicRecord.phone,
        shopPhone: savedMechanicRecord.shopPhone,
        address: savedMechanicRecord.address,
        city: savedMechanicRecord.city,
        pincode: savedMechanicRecord.pincode,
        latitude: savedMechanicRecord.latitude,
        lat: savedMechanicRecord.latitude,
        longitude: savedMechanicRecord.longitude,
        lng: savedMechanicRecord.longitude,
        vehicleTypes: savedMechanicRecord.vehicleTypes,
        specializations: savedMechanicRecord.specializations,
        workingDays: savedMechanicRecord.workingDays,
        openTime: savedMechanicRecord.openTime,
        closeTime: savedMechanicRecord.closeTime,
        priceMin: savedMechanicRecord.priceMin,
        priceMax: savedMechanicRecord.priceMax,
        yearsExperience: savedMechanicRecord.yearsExperience,
        photos: savedMechanicRecord.photos,
        isVerified: false,
        approvalStatus: "pending",
        availabilityStatus: "available",
      },
    });
  } catch (err: any) {
    console.error("[RegisterShop API] Unexpected POST error:", err?.message);
    return Response.json(
      {
        success: false,
        error: "Registration could not be completed. Please check all details and try again.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ success: false, error: "Invalid update payload." }, { status: 400 });
    }

    const id = body.id;
    if (!id) {
      return Response.json({ success: false, error: "Shop ID is required for updates." }, { status: 400 });
    }

    const sessionUser = await getSessionUser().catch(() => null);
    const requesterPhone = (sessionUser?.phone || body.phone || "").replace(/\D/g, "");

    const shopName = body.shopName ? cleanText(body.shopName, 120) : undefined;
    const ownerName = body.ownerName ? cleanText(body.ownerName, 80) : undefined;
    const phone = body.phone ? cleanText(body.phone, 20) : undefined;
    const shopPhone = body.shopPhone ? cleanText(body.shopPhone, 20) : undefined;
    const address = body.address ? cleanText(body.address, 250) : undefined;
    const city = body.city ? cleanText(body.city, 80) : undefined;
    const pincode = body.pincode ? cleanText(body.pincode, 10) : undefined;
    const latitude = body.latitude !== undefined && Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : undefined;
    const longitude = body.longitude !== undefined && Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : undefined;
    const openTime = body.openTime ? cleanText(body.openTime, 5) : undefined;
    const closeTime = body.closeTime ? cleanText(body.closeTime, 5) : undefined;
    const priceMin = body.priceMin !== undefined ? Number(body.priceMin) : undefined;
    const priceMax = body.priceMax !== undefined ? Number(body.priceMax) : undefined;
    const specializations = Array.isArray(body.specializations) ? body.specializations : undefined;
    const workingDays = Array.isArray(body.workingDays) ? body.workingDays : undefined;
    const availabilityStatus = body.availabilityStatus ? cleanText(body.availabilityStatus, 20) : undefined;

    // Update local database
    const localUpdates: Record<string, any> = {};
    if (shopName) localUpdates.shopName = shopName;
    if (ownerName) localUpdates.ownerName = ownerName;
    if (phone) localUpdates.phone = phone;
    if (shopPhone) localUpdates.shopPhone = shopPhone;
    if (address) localUpdates.address = address;
    if (city) localUpdates.city = city;
    if (pincode) localUpdates.pincode = pincode;
    if (latitude !== undefined) localUpdates.latitude = latitude;
    if (longitude !== undefined) localUpdates.longitude = longitude;
    if (openTime) localUpdates.openTime = openTime;
    if (closeTime) localUpdates.closeTime = closeTime;
    if (priceMin !== undefined) localUpdates.priceMin = priceMin;
    if (priceMax !== undefined) localUpdates.priceMax = priceMax;
    if (specializations) localUpdates.specializations = specializations;
    if (workingDays) localUpdates.workingDays = workingDays;
    if (availabilityStatus) localUpdates.availabilityStatus = availabilityStatus;

    try {
      await db.update(mechanics).set(localUpdates).where(eq(mechanics.id, id));
    } catch (localUpdErr) {
      console.warn("[RegisterShop API] Local update note:", localUpdErr);
    }

    // Sync updates to Supabase
    try {
      const supaUpdates: Record<string, any> = {};
      if (shopName) supaUpdates.shop_name = shopName;
      if (ownerName) supaUpdates.owner_name = ownerName;
      if (phone || shopPhone) supaUpdates.phone = shopPhone || phone;
      if (address) supaUpdates.address = address;
      if (latitude !== undefined) supaUpdates.lat = latitude;
      if (longitude !== undefined) supaUpdates.lng = longitude;
      if (specializations) supaUpdates.services = specializations;

      await supabase.from("shops").update(supaUpdates).eq("id", id);
    } catch {}

    return Response.json({ success: true, message: "Workshop updated successfully!" });
  } catch (err: any) {
    console.error("[RegisterShop API] Unexpected PATCH error:", err?.message);
    return Response.json({ success: false, error: "Workshop update failed." }, { status: 500 });
  }
}
