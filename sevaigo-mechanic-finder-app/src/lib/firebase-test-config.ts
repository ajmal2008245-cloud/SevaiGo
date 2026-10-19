/**
 * Firebase Phone Authentication — Free Testing Configuration
 * 
 * In Firebase Console (Spark Plan / 100% Free Tier):
 * 1. Go to Firebase Console -> Authentication -> Sign-in method
 * 2. Enable "Phone" provider
 * 3. Expand the "Phone numbers for testing" section
 * 4. Add test phone numbers along with their designated 6-digit test verification codes:
 *    - Example 1: Phone: +91 9876543210 -> Test Code: 123456
 *    - Example 2: Phone: +91 9999999999 -> Test Code: 654321
 *    - Example 3: Phone: +91 9123456789 -> Test Code: 112233
 * 
 * Free Testing Rules:
 * - No actual SMS delivery is performed (0 cost, no billing required).
 * - Firebase Authentication validates only against designated test credentials.
 * - Incorrect OTPs are rejected with clear error messages.
 */

export interface FirebaseTestPhoneNumber {
  phoneNumber: string;
  formattedDisplay: string;
  testVerificationCode: string;
  label: string;
}

export const FIREBASE_TEST_PHONE_NUMBERS: FirebaseTestPhoneNumber[] = [
  {
    phoneNumber: "+919876543210",
    formattedDisplay: "+91 98765 43210",
    testVerificationCode: "123456",
    label: "Demo Rider (Primary Test)",
  },
  {
    phoneNumber: "+919999999999",
    formattedDisplay: "+91 99999 99999",
    testVerificationCode: "654321",
    label: "Secondary Test Account",
  },
  {
    phoneNumber: "+919123456789",
    formattedDisplay: "+91 91234 56789",
    testVerificationCode: "112233",
    label: "Emergency Rescue Test",
  },
];

export function cleanPhoneDigits(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function formatIndianPhoneNumber(digits: string): string {
  const clean = cleanPhoneDigits(digits);
  const tenDigits = clean.length > 10 ? clean.slice(-10) : clean;
  return `+91${tenDigits}`;
}

export function findFirebaseTestConfig(phoneOrDigits: string): FirebaseTestPhoneNumber | undefined {
  const clean = cleanPhoneDigits(phoneOrDigits);
  const tenDigits = clean.length > 10 ? clean.slice(-10) : clean;
  return FIREBASE_TEST_PHONE_NUMBERS.find((item) =>
    cleanPhoneDigits(item.phoneNumber).endsWith(tenDigits)
  );
}

export function isFirebaseTestNumber(phoneOrDigits: string): boolean {
  return !!findFirebaseTestConfig(phoneOrDigits);
}

/**
 * Validates test OTP against configured Firebase test numbers.
 * Rejects incorrect OTPs and unconfigured numbers.
 */
export function verifyFirebaseTestCode(
  phoneOrDigits: string,
  enteredCode: string
): { success: boolean; error?: string; config?: FirebaseTestPhoneNumber } {
  const testConfig = findFirebaseTestConfig(phoneOrDigits);
  if (!testConfig) {
    return {
      success: false,
      error:
        "This phone number is not configured in Firebase test numbers. Please use a configured test number (e.g. +91 98765 43210) or register this number in Firebase Console -> Authentication -> Sign-in method -> Phone numbers for testing.",
    };
  }

  const cleanEntered = (enteredCode || "").trim().replace(/\D/g, "");
  if (cleanEntered.length !== 6) {
    return {
      success: false,
      error: "Please enter the complete 6-digit test verification code.",
    };
  }

  if (cleanEntered !== testConfig.testVerificationCode) {
    return {
      success: false,
      error:
        "Incorrect verification code. The entered test OTP does not match the code configured in Firebase. Please enter the valid test code.",
    };
  }

  return { success: true, config: testConfig };
}
