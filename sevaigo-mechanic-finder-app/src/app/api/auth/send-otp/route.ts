import { cleanText } from "@/lib/api";
import { findFirebaseTestConfig } from "@/lib/firebase-test-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = cleanText(body.phone, 20);

    if (!phone || phone.length < 10) {
      return Response.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const testConfig = findFirebaseTestConfig(phone);

    return Response.json({
      success: true,
      mode: "firebase-phone-test",
      isTestNumber: Boolean(testConfig),
      phoneNumber: `+91${phone.slice(-10)}`,
      message: testConfig
        ? "Firebase test number ready. Use the test verification code configured in Firebase Console."
        : "Unregistered test number. Add to Firebase Console -> Authentication -> Sign-in method -> Phone numbers for testing.",
    });
  } catch (err) {
    return Response.json({ error: "Failed to process request" }, { status: 500 });
  }
}
