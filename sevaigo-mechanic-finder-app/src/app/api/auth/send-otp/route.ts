import { cleanText } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = cleanText(body.phone, 20);
    const otp = cleanText(body.otp, 10);

    if (!phone || phone.length < 10) {
      return Response.json({ error: "Invalid phone number" }, { status: 400 });
    }

    console.log(`[SevaiGo OTP Gateway] Dispatched OTP ${otp} for phone +91 ${phone}`);

    return Response.json({
      success: true,
      message: `OTP dispatched to +91 ${phone}`,
      phone,
    });
  } catch (err) {
    return Response.json({ error: "Failed to dispatch OTP" }, { status: 500 });
  }
}
