/**
 * SevaiGo Geolocation Utility
 * Fully compliant with browser Geolocation API, HTTPS requirements,
 * mobile Android Chrome & desktop browsers, with high-accuracy GPS
 * and fast network-triangulation fallback.
 */

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  shortLabel: string;
  city?: string;
  area?: string;
  pincode?: string;
  timestamp: number;
}

export type GpsErrorType =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "insecure_context"
  | "unsupported"
  | "unknown";

export interface GpsErrorInfo {
  type: GpsErrorType;
  title: string;
  message: string;
  instructions: string[];
}

const STORAGE_KEY = "userSavedLocation";

/**
 * Check if the current context supports secure Geolocation.
 * Android Chrome and modern browsers require HTTPS or localhost.
 */
export function isGeolocationSupported(): { supported: boolean; isSecure: boolean; error?: GpsErrorInfo } {
  if (typeof window === "undefined") {
    return { supported: false, isSecure: false };
  }

  if (!("geolocation" in navigator)) {
    return {
      supported: false,
      isSecure: true,
      error: {
        type: "unsupported",
        title: "Geolocation Not Supported",
        message: "Your browser does not support GPS location detection.",
        instructions: [
          "Please use a modern browser such as Google Chrome, Edge, or Safari.",
          "Or enter your breakdown area manually in the search box below.",
        ],
      },
    };
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (!window.isSecureContext && !isLocalhost) {
    return {
      supported: true,
      isSecure: false,
      error: {
        type: "insecure_context",
        title: "HTTPS Connection Required",
        message: "Mobile browsers (including Chrome on Android) require HTTPS to detect GPS location.",
        instructions: [
          "Please open SevaiGo using a secure https:// link.",
          "Or search your location manually using the area search box below.",
        ],
      },
    };
  }

  return { supported: true, isSecure: true };
}

/**
 * Check the current browser permission state for Geolocation if Permissions API is supported.
 */
export async function getGeolocationPermissionState(): Promise<"granted" | "prompt" | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions || !navigator.permissions.query) {
    return "unsupported";
  }
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return result.state;
  } catch {
    return "unsupported";
  }
}

/**
 * Formats user-friendly error details with step-by-step instructions.
 */
export function parseGeolocationError(error: GeolocationPositionError | Error | any): GpsErrorInfo {
  const code = error?.code;

  if (code === 1 || error?.name === "NotAllowedError") {
    return {
      type: "permission_denied",
      title: "Location Permission Denied",
      message: "Browser location permission was blocked or denied.",
      instructions: [
        "On Android Chrome: Tap the 🔒 or 🎚️ icon in your address bar → Permissions → Location → Select 'Allow'.",
        "On Desktop Chrome / Edge: Click the 🔒 icon next to the URL → Location → Select 'Allow'.",
        "On iPhone Safari: Tap the 'aA' or lock icon in the address bar → Website Settings → Location → Select 'Allow'.",
        "After enabling, tap the 'Retry GPS' button below.",
      ],
    };
  }

  if (code === 2) {
    return {
      type: "position_unavailable",
      title: "GPS Position Unavailable",
      message: "Unable to retrieve GPS satellite coordinates from your device.",
      instructions: [
        "Make sure 'Location / GPS' toggle is turned ON in your phone or device settings.",
        "If you are indoors, step near a window or outdoors for better satellite reception.",
        "You can also use 'Pick on Map' or type your area in the search box below.",
      ],
    };
  }

  if (code === 3) {
    return {
      type: "timeout",
      title: "GPS Request Timed Out",
      message: "Acquiring high-accuracy GPS coordinates took longer than expected.",
      instructions: [
        "Tap 'Retry GPS' below to try detecting again.",
        "Or pick your exact spot on the map or type your area below.",
      ],
    };
  }

  return {
    type: "unknown",
    title: "GPS Detection Failed",
    message: error?.message || "Could not detect your current GPS location.",
    instructions: [
      "Check your device GPS toggle and network connection.",
      "Tap 'Retry GPS' to try again.",
      "Or type your location in the search box below.",
    ],
  };
}

/**
 * Internal promise-based wrapper around navigator.geolocation.getCurrentPosition
 */
function fetchPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Acquire user's real GPS coordinates.
 * Uses high accuracy first with 15s timeout.
 * If high accuracy fails or times out (common indoors or on laptops),
 * automatically falls back to standard accuracy (network/Wi-Fi triangulation).
 */
export async function getCurrentGpsPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  const check = isGeolocationSupported();
  if (!check.supported || check.error) {
    throw check.error;
  }

  // Attempt 1: High Accuracy GPS (Satellite Fix)
  try {
    const pos = await fetchPosition({
      enableHighAccuracy: true,
      timeout: 14000,
      maximumAge: 0,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err: any) {
    // If permission was denied by user, do not retry; throw immediately
    if (err.code === 1) {
      throw parseGeolocationError(err);
    }

    // Attempt 2: Fallback to standard accuracy (Wi-Fi, cellular, IP network location)
    try {
      const fallbackPos = await fetchPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
      return {
        latitude: fallbackPos.coords.latitude,
        longitude: fallbackPos.coords.longitude,
        accuracy: fallbackPos.coords.accuracy,
      };
    } catch (fallbackErr: any) {
      throw parseGeolocationError(fallbackErr);
    }
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable address.
 * Calls backend /api/geocode/reverse, with client-side fallback if needed.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ shortLabel: string; fullAddress: string; city: string; area: string; pincode: string }> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          shortLabel: data.shortLabel || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          fullAddress: data.address || data.displayName || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          city: data.city || "",
          area: data.area || "",
          pincode: data.pincode || "",
        };
      }
    }
  } catch {
    // Backend API unreachable; attempt direct client fallback to BigDataCloud
  }

  try {
    const clientRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (clientRes.ok) {
      const bdc = await clientRes.json();
      const area = bdc.locality || bdc.subLocality || "";
      const city = bdc.city || bdc.principalSubdivision || "";
      const shortLabel = [area, city].filter(Boolean).join(", ") || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const fullAddress = [area, city, bdc.principalSubdivision, bdc.postcode].filter(Boolean).join(", ") || shortLabel;
      return {
        shortLabel,
        fullAddress,
        city,
        area,
        pincode: bdc.postcode || "",
      };
    }
  } catch {
    // Both failed
  }

  const coordStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return {
    shortLabel: `GPS: ${coordStr}`,
    fullAddress: `GPS Location (${coordStr})`,
    city: "",
    area: "",
    pincode: "",
  };
}

/**
 * Save user's detected or manually picked location to localStorage for seamless persistence.
 */
export function saveUserLocation(location: {
  latitude: number;
  longitude: number;
  label: string;
  source?: "gps" | "manual" | "search";
}): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...location,
        timestamp: Date.now(),
      })
    );
  } catch {}
}

/**
 * Retrieve saved location from localStorage if valid.
 */
export function getSavedUserLocation(): {
  latitude: number;
  longitude: number;
  label: string;
  source: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.latitude === "number" &&
      typeof parsed?.longitude === "number" &&
      !isNaN(parsed.latitude) &&
      !isNaN(parsed.longitude) &&
      parsed.latitude >= -90 &&
      parsed.latitude <= 90 &&
      parsed.longitude >= -180 &&
      parsed.longitude <= 180 &&
      parsed.label
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

