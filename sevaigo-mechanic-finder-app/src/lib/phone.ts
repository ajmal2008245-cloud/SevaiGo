/**
 * SEVAIGO Phone Calling Utilities
 * Ensures genuine, valid RFC 3966 tel: links, phone validation,
 * mobile device detection, and desktop fallback handling.
 */

/**
 * Strips formatting and normalizes an Indian or international mobile number.
 * Returns an E.164-compatible clean number string (e.g. '+918667084522')
 * or an empty string if invalid.
 */
export function cleanPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";

  // Remove spaces, hyphens, parentheses, dots
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, "");

  // If starts with +91, ensure rest is digits
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1).replace(/\D/g, "");
    if (digitsOnly.length < 10) return "";
    return `+${digitsOnly}`;
  }

  // If starts with 0 and has 11 digits (e.g. 08667084522)
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Keep only digits
  const digits = cleaned.replace(/\D/g, "");

  // Standard 10-digit Indian mobile number
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // 12-digit number starting with 91
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // Valid international length (10 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
}

/**
 * Checks whether a phone number is valid (at least 10 valid digits).
 */
export function isValidPhoneNumber(rawPhone?: string | null): boolean {
  const cleaned = cleanPhoneNumber(rawPhone);
  return Boolean(cleaned && cleaned.replace(/\D/g, "").length >= 10);
}

/**
 * Returns a valid RFC 3966 tel: URI (e.g. 'tel:+918667084522').
 * Returns '' if invalid.
 */
export function getTelUri(rawPhone?: string | null): string {
  const cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return "";
  return `tel:${cleaned}`;
}

/**
 * Formats a phone number for user-friendly display (e.g. '+91 86670 84522').
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  const cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return rawPhone || "No phone number";

  // E.g. +918667084522 -> +91 86670 84522
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    const main = cleaned.slice(3);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }

  return cleaned;
}

export interface RescueDispatchPayload {
  shopName?: string;
  userName?: string;
  userPhone?: string;
  vehicle?: string;
  problem?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  notes?: string;
}

/**
 * Returns formatted WhatsApp dispatch link containing exact GPS link, breakdown issue, and vehicle details.
 */
export function getWhatsAppRescueUri(rawPhone?: string | null, payload: RescueDispatchPayload = {}): string {
  const cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return "";
  const digits = cleaned.replace(/\D/g, "");

  const mapsLink =
    payload.latitude && payload.longitude
      ? `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`
      : "Live GPS attached";

  const message = [
    `🚨 *SEVAIGO EMERGENCY RESCUE DISPATCH*`,
    ``,
    `📍 *Live Location:* ${mapsLink}`,
    payload.locationLabel ? `📌 *Area / Landmark:* ${payload.locationLabel}` : "",
    `🏍️ *Vehicle:* ${payload.vehicle || "Motorcycle / Vehicle"}`,
    `⚠️ *Breakdown Problem:* ${payload.problem || "Breakdown / Emergency Help"}`,
    `👤 *Rider Name:* ${payload.userName || "Rider in Need"}`,
    `📞 *Contact Number:* ${payload.userPhone || "Provided on call"}`,
    payload.notes ? `📝 *Notes:* ${payload.notes}` : "",
    ``,
    `--------------------------------`,
    `Please confirm if you can dispatch immediately. Sent via SevaiGo Roadside Rescue.`,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Returns WhatsApp chat link for mobile or web.
 */
export function getWhatsAppUri(rawPhone?: string | null, message = "Hello, I found your workshop on SEVAIGO."): string {
  const cleaned = cleanPhoneNumber(rawPhone);
  if (!cleaned) return "";
  const digits = cleaned.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Detects whether the current browser session is running on a mobile phone / cellular-capable device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(ua);

  // Also check touch capabilities with typical mobile screen sizes
  const isTouchScreen = (navigator.maxTouchPoints > 0 || "ontouchstart" in window) && window.innerWidth <= 820;

  return isMobileUA || isTouchScreen;
}
