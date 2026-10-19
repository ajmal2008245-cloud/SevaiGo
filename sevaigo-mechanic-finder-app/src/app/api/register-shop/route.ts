import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mechanics, users } from "@/db/schema";
import { cleanText } from "@/lib/api";
import { createSession, getSessionUser, hashPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    const sessionUser = await getSessionUser().catch(() => null);
    const targetPhone = phone || sessionUser?.phone;

    if (!targetPhone) {
      return Response.json({ success: true, shop: null });
    }

    const cleanDigits = targetPhone.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[RegisterShop API] GET Supabase shops error:", error);
      return Response.json({ success: true, shop: null });
    }

    const matched = (data || []).find((s: any) => {
      const p = (s.phone || "").replace(/\D/g, "");
      return (
        p === cleanDigits ||
        (cleanDigits.length >= 10 && p.endsWith(cleanDigits.slice(-10))) ||
        (p.length >= 10 && cleanDigits.endsWith(p.slice(-10)))
      );
    });

    return Response.json({ success: true, shop: matched || null });
  } catch (err: any) {
    console.error("[RegisterShop API] GET fatal error:", err);
    return Response.json({ success: false, error: err.message || "Failed to fetch workshop" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ success: false, error: "Invalid registration payload." }, { status: 400 });
    }

    const shopName = cleanText(body.shopName, 120);
    const ownerName = cleanText(body.ownerName, 80);
    const phone = cleanText(body.phone, 20);
    const shopPhone = cleanText(body.shopPhone, 20) || phone;
    const address = cleanText(body.address, 250);
    const city = cleanText(body.city, 80) || "Chennai";
    const pincode = cleanText(body.pincode, 10);
    const email = cleanText(body.email, 120);
    const password = typeof body.password === "string" ? body.password : "";
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

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
      return Response.json({ success: false, error: "Please select an exact location on the map." }, { status: 400 });
    }

    const fullAddress = address.trim() + (city ? `, ${city}` : "") + (pincode ? ` - ${pincode}` : "");
    const vehicleTypes = Array.isArray(body.vehicleTypes) ? body.vehicleTypes : ["2w", "4w"];
    const specializations = Array.isArray(body.specializations) ? body.specializations : ["General service & Oil change"];
    const servicesList = Array.from(new Set([...vehicleTypes, ...specializations]));

    // 1. Session / User Creation (if not already logged in)
    let currentSessionUser = await getSessionUser().catch(() => null);
    if (!currentSessionUser) {
      try {
        const userEmail = email && email.includes("@") ? email.toLowerCase() : `owner_${cleanPhone.slice(-10)}@sevaigo.local`;
        const [existingUser] = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
        let userId: string;
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const userPassword = password && password.length >= 6 ? password : `SevaiGo_${cleanPhone.slice(-6)}`;
          const [newUser] = await db
            .insert(users)
            .values({
              name: ownerName,
              email: userEmail,
              phone: cleanPhone,
              passwordHash: hashPassword(userPassword),
              role: "owner",
            })
            .returning();
          userId = newUser.id;
        }
        await createSession(userId);
      } catch (authErr) {
        console.warn("[RegisterShop API] Local auth session creation warning:", authErr);
      }
    }

    // 2. Insert into Supabase `shops` table (Primary backend)
    const { data: insertedShops, error: supaError } = await supabase
      .from("shops")
      .insert({
        shop_name: shopName,
        owner_name: ownerName,
        phone: shopPhone || phone,
        address: fullAddress,
        lat: latitude,
        lng: longitude,
        services: servicesList,
        verified: true,
      })
      .select();

    if (supaError) {
      console.error("[RegisterShop API] Supabase insert failed:", supaError);
      return Response.json(
        {
          success: false,
          error: supaError.message || "Failed to save workshop to Supabase database.",
        },
        { status: 500 }
      );
    }

    const createdShop = (insertedShops && insertedShops[0]) || {
      shop_name: shopName,
      owner_name: ownerName,
      phone: shopPhone || phone,
      address: fullAddress,
      lat: latitude,
      lng: longitude,
      services: servicesList,
      verified: true,
    };

    // 3. Sync to local database `mechanics` table so it immediately shows up in all queries
    try {
      const activeUser = await getSessionUser().catch(() => null);
      if (activeUser) {
        const slug = `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${randomBytes(3).toString("hex")}`;
        await db
          .insert(mechanics)
          .values({
            slug,
            ownerUserId: activeUser.id,
            shopName,
            ownerName,
            phone: cleanPhone,
            shopPhone: (shopPhone || phone).trim(),
            address,
            city,
            pincode,
            latitude,
            longitude,
            vehicleTypes,
            specializations,
            workingDays: Array.isArray(body.workingDays) ? body.workingDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            openTime: cleanText(body.openTime, 5) || "08:00",
            closeTime: cleanText(body.closeTime, 5) || "21:00",
            photos: Array.isArray(body.photos) && body.photos.length ? body.photos : ["/images/workshop-1.jpg"],
            ownerPhoto: "/images/owner-1.jpg",
            isVerified: true,
            approvalStatus: "approved",
            availabilityStatus: "available",
            priceMin: Math.max(0, Math.round(Number(body.priceMin) || 300)),
            priceMax: Math.max(300, Math.round(Number(body.priceMax) || 2500)),
            yearsExperience: Math.max(0, Math.round(Number(body.yearsExperience) || 5)),
            spareParts: Array.isArray(body.spareParts) ? body.spareParts : [],
          })
          .catch((e: any) => console.warn("[RegisterShop API] Local mechanics insert duplicate/warning:", e?.message));
      }
    } catch (localDbErr: any) {
      console.warn("[RegisterShop API] Local DB sync note:", localDbErr?.message);
    }

    console.log(`[RegisterShop API] Workshop registered successfully: ${shopName} (${phone})`);

    return Response.json({
      success: true,
      message: "Workshop registered successfully!",
      shop: createdShop,
    });
  } catch (err: any) {
    console.error("[RegisterShop API] Unexpected POST error:", err);
    return Response.json(
      {
        success: false,
        error: err.message || "An unexpected server error occurred during registration.",
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
    const shopName = body.shopName ? cleanText(body.shopName, 120) : undefined;
    const ownerName = body.ownerName ? cleanText(body.ownerName, 80) : undefined;
    const phone = body.phone ? cleanText(body.phone, 20) : undefined;
    const shopPhone = body.shopPhone ? cleanText(body.shopPhone, 20) : undefined;
    const address = body.address ? cleanText(body.address, 250) : undefined;
    const latitude = body.latitude !== undefined ? Number(body.latitude) : undefined;
    const longitude = body.longitude !== undefined ? Number(body.longitude) : undefined;
    const services = Array.isArray(body.services) ? body.services : undefined;

    const supaUpdates: Record<string, any> = {};
    if (shopName) supaUpdates.shop_name = shopName;
    if (ownerName) supaUpdates.owner_name = ownerName;
    if (phone || shopPhone) supaUpdates.phone = shopPhone || phone;
    if (address) supaUpdates.address = address;
    if (latitude !== undefined) supaUpdates.lat = latitude;
    if (longitude !== undefined) supaUpdates.lng = longitude;
    if (services) supaUpdates.services = services;

    if (id) {
      const { data, error } = await supabase
        .from("shops")
        .update(supaUpdates)
        .eq("id", id)
        .select();

      if (error) {
        console.error("[RegisterShop API] Supabase PATCH error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, message: "Workshop updated successfully!", shop: data?.[0] });
    } else if (phone) {
      const { data, error } = await supabase
        .from("shops")
        .update(supaUpdates)
        .eq("phone", phone)
        .select();

      if (error) {
        console.error("[RegisterShop API] Supabase PATCH error by phone:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, message: "Workshop updated successfully!", shop: data?.[0] });
    }

    return Response.json({ success: false, error: "Shop ID or Phone number required to update." }, { status: 400 });
  } catch (err: any) {
    console.error("[RegisterShop API] Unexpected PATCH error:", err);
    return Response.json({ success: false, error: err.message || "Failed to update workshop." }, { status: 500 });
  }
}
