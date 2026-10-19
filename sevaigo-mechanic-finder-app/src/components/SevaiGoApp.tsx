"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bike, Calendar, Camera, CarFront, Check, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, Compass, Copy, Heart, HelpCircle, Layers, LifeBuoy, LocateFixed, LogOut, MapPin,
  Menu, MessageCircle, Moon, Navigation, Package, Percent, Phone, Plus, Search, Settings, Settings2,
  Shield, ShieldCheck, SlidersHorizontal, Sparkles, Star, Store, Sun, Tag, Trash2, Truck, User, UserRound,
  Wrench, X, Zap,
} from "lucide-react";

import MotorcycleScene from "@/components/3d/MotorcycleScene";
import BikeBackground from "@/components/3d/BikeBackground";
import CinematicHero from "@/components/CinematicHero";
import SplashScreen from "@/components/SplashScreen";
import LoginView from "@/components/LoginView";
import NearbyGaragesView from "@/components/NearbyGaragesView";
import ServiceBookingFlow from "@/components/ServiceBookingFlow";
import TrackServiceView from "@/components/TrackServiceView";
import LiveTrackingView from "@/components/LiveTrackingView";
import ProfileView from "@/components/ProfileView";
import SparePartsModal from "@/components/modals/SparePartsModal";
import OffersModal from "@/components/modals/OffersModal";
import HelpModal from "@/components/modals/HelpModal";
import MechanicMap, { type MapLocation } from "@/components/MechanicMap";
import RegisterShopFlow from "@/components/RegisterShopFlow";
import CustomerDashboard from "@/components/CustomerDashboard";
import ShopCard from "@/components/ShopCard";
import ShopDetail, { type ShopReview } from "@/components/ShopDetail";

import type { PublicUser } from "@/lib/auth";
import { t, type Language } from "@/lib/copy";
import { DEMO_LOCATION, type MechanicView } from "@/lib/mechanic-shared";
import { cleanPhoneNumber, formatPhoneDisplay, getTelUri, getWhatsAppRescueUri, getWhatsAppUri, isMobileDevice, isValidPhoneNumber } from "@/lib/phone";
import { supabase } from "@/lib/supabaseClient";

export type View =
  | "splash"
  | "home"
  | "garages"
  | "booking"
  | "track"
  | "live-tracking"
  | "profile"
  | "rescue"
  | "explore"
  | "saved"
  | "vehicles"
  | "activity"
  | "register-shop";

type VehicleItem = { id: string; make: string; model: string; year: number; type: string; registration: string | null; createdAt: string };
type BreakdownItem = { id: string; mechanicId: string; shopName: string; action: string; issue: string; status?: string; vehicleType?: string; createdAt: string };
type NoticeItem = { id: string; title: string; message: string; isRead: boolean; createdAt: string };
type OwnerShop = { id: string; shopName: string; ownerName: string; address: string; phone: string; photos: string[]; approvalStatus: string; availabilityStatus: string; priceMin: number; priceMax: number; openTime: string; closeTime: string; isVerified: boolean };
type PendingShop = { id: string; shopName: string; ownerName: string; address: string; phone: string; vehicleTypes: string[]; specializations: string[]; photos: string[]; createdAt: string };

const POPULAR_SERVICES_HOME = [
  { id: "general", title: "General Service", price: 499, duration: "2-3 Hours", desc: "Complete 25-point inspection, engine oil check & wash" },
  { id: "oil", title: "Oil Change", price: 299, duration: "45 Mins", desc: "Motul synthetic oil flush, new filter & cleanup" },
  { id: "chain", title: "Chain Cleaning", price: 199, duration: "30 Mins", desc: "Ultrasonic degreasing & Motul synthetic lube" },
  { id: "brake", title: "Brake Check", price: 399, duration: "1 Hour", desc: "Front & rear brake disc inspection & pad deburring" },
  { id: "full_body", title: "Full Body Check", price: 599, duration: "3-4 Hours", desc: "Chassis, suspension, electrical & ECU diagnostics" },
];

const RESCUE_PRICE_ESTIMATES: Record<string, number> = {
  Puncture: 150,
  Battery: 299,
  Engine: 399,
  "Starting Problem": 249,
  "Fuel Issue": 199,
};

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
function jsonOptions(body: unknown, method = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
function dateLabel(date: string, language: Language) {
  return new Date(date).toLocaleDateString(language === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SevaiGoApp({
  initialShops,
  initialUser,
}: {
  initialShops: MechanicView[];
  initialUser: PublicUser | null;
}) {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [shops, setShops] = useState<MechanicView[]>(initialShops);
  const [location, setLocation] = useState<MapLocation>({ ...DEMO_LOCATION, label: "Detecting GPS...", source: "gps" });
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [sort, setSort] = useState("distance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [toast, setToast] = useState("");

  // Authentication State: First time starts logged out for phone + OTP login
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [userPhone, setUserPhone] = useState(initialUser?.phone || "");
  const [userName, setUserName] = useState(initialUser?.name || "");

  // Modals State
  const [sparePartsOpen, setSparePartsOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>({
    id: "SG#45872",
    referenceId: "SG#45872",
    bike: "Yamaha FZ",
    service: "General Service",
    price: 499,
    date: "26 Oct 2026",
    status: "In Progress",
    garageName: "Rider's Garage & Speed Care",
    mechanic: {
      name: "Ravi Kumar",
      phone: "+91 98765 43210",
      role: "Senior Master Technician",
    },
  });

  // Rescue & Garage State
  const [radiusKm, setRadiusKm] = useState(5);
  const [rescueVehicle, setRescueVehicle] = useState<"bike" | "car" | "auto" | "other">("bike");
  const [rescueProblem, setRescueProblem] = useState("Puncture");
  const [callingShop, setCallingShop] = useState<MechanicView | null>(null);
  const [requestingShop, setRequestingShop] = useState<MechanicView | null>(null);
  const [rescueName, setRescueName] = useState(initialUser?.name || "");
  const [rescuePhone, setRescuePhone] = useState(initialUser?.phone || "");
  const [rescueNotes, setRescueNotes] = useState("");
  const [rescuePhoto, setRescuePhoto] = useState("");
  const [showRescueMap, setShowRescueMap] = useState(false);
  const [submittingRescue, setSubmittingRescue] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [activeRescue, setActiveRescue] = useState<any | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteShops, setFavoriteShops] = useState<MechanicView[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([
    {
      id: "n-1",
      title: "Service Underway",
      message: "Ravi Kumar has completed the diagnosis for your Yamaha FZ.",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "n-2",
      title: "Monsoon Bike Care Offer",
      message: "Use code FREECHAIN for complimentary chain cleaning.",
      isRead: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
  const [ownerShop, setOwnerShop] = useState<OwnerShop | null>(null);
  const [pendingShops, setPendingShops] = useState<PendingShop[]>([]);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const firstLocationRender = useRef(true);

  const say = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(timeout);
  }, [toast]);

  // Restore stored session and cached location on client mount
  useEffect(() => {
    try {
      const storedLoggedIn = localStorage.getItem("isLoggedIn");
      const storedPhone = localStorage.getItem("userPhone");
      const storedName = localStorage.getItem("userName");
      const storedRole = (localStorage.getItem("userRole") as "customer" | "mechanic") || "customer";

      if (storedLoggedIn === "true" && storedPhone) {
        setIsLoggedIn(true);
        setUserPhone(storedPhone);
        setUserName(storedName || (storedRole === "mechanic" ? `Mechanic ${storedPhone.slice(-4)}` : `Rider ${storedPhone.slice(-4)}`));
        setRescuePhone(storedPhone);
        setRescueName(storedName || (storedRole === "mechanic" ? `Mechanic ${storedPhone.slice(-4)}` : `Rider ${storedPhone.slice(-4)}`));
        setUser({
          id: `u-${storedPhone}`,
          name: storedName || (storedRole === "mechanic" ? `Mechanic ${storedPhone.slice(-4)}` : `Rider ${storedPhone.slice(-4)}`),
          phone: storedPhone,
          email: `${storedPhone}@sevaigo.local`,
          role: storedRole,
        });

        // Set initial view according to role
        if (storedRole === "mechanic") {
          setView("register-shop");
        }
      }

      const cachedLocStr = localStorage.getItem("userSavedLocation");
      if (cachedLocStr) {
        const cachedLoc = JSON.parse(cachedLocStr);
        if (cachedLoc && cachedLoc.latitude && cachedLoc.longitude && cachedLoc.label) {
          setLocation(cachedLoc);
        }
      }
    } catch {}
    setCheckingAuth(false);
  }, []);

  const handleLoginSuccess = async (phone: string, inputName?: string, role: "customer" | "mechanic" = "customer") => {
    let finalRole = role;
    let finalName = inputName || (role === "mechanic" ? `Mechanic ${phone.slice(-4)}` : `Rider ${phone.slice(-4)}`);

    // Verify role securely with Supabase profiles table
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: finalName, role }),
      });
      const data = await res.json().catch(() => null);
      if (data?.profile?.role) {
        finalRole = data.profile.role;
        finalName = data.profile.name || finalName;
      }
    } catch {}

    try {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userPhone", phone);
      localStorage.setItem("userName", finalName);
      localStorage.setItem("userRole", finalRole);
    } catch {}

    setIsLoggedIn(true);
    setUserPhone(phone);
    setUserName(finalName);
    setRescuePhone(phone);
    setRescueName(finalName);
    setUser({
      id: `u-${phone}`,
      name: finalName,
      phone,
      email: `${phone}@sevaigo.local`,
      role: finalRole,
    });

    if (finalRole === "mechanic") {
      setView("register-shop");
      say(`Signed in as Mechanic! Welcome to your workshop portal, ${finalName}.`);
    } else {
      setView("home");
      say(`Signed in as Customer! Welcome to SevaiGo, ${finalName}.`);
    }
  };

  const handleFullLogout = () => {
    try {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userPhone");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
    } catch {}
    setIsLoggedIn(false);
    setUser(null);
    setUserPhone("");
    setUserName("");
    void apiRequest("/api/auth", jsonOptions({ action: "logout" })).catch(() => {});
    say("Logged out safely.");
    setView("home");
  };

  const refreshShops = useCallback(
    async (position: MapLocation, rad: number = radiusKm) => {
      setLoadingShops(true);
      try {
        const { data: supaRows, error: supaErr } = await supabase
          .from("shops")
          .select("*")
          .order("created_at", { ascending: false });

        if (!supaErr && supaRows && supaRows.length > 0) {
          const mappedShops: MechanicView[] = supaRows.map((row: any) => {
            const lat = Number(row.lat ?? row.latitude ?? DEMO_LOCATION.latitude);
            const lng = Number(row.lng ?? row.longitude ?? DEMO_LOCATION.longitude);
            const radVal = Math.PI / 180;
            const dLat = (lat - position.latitude) * radVal;
            const dLon = (lng - position.longitude) * radVal;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(position.latitude * radVal) *
                Math.cos(lat * radVal) *
                Math.sin(dLon / 2) ** 2;
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const rawServices: string[] = Array.isArray(row.services) ? row.services : [];

            return {
              id: String(row.id),
              slug: String(row.id),
              shopName: row.shop_name || row.shopName || "Rider's Garage & Speed Care",
              ownerName: row.owner_name || row.ownerName || "Ravi Kumar",
              ownerPhoto: "/images/owner-1.jpg",
              phone: row.phone || "+91 98765 43210",
              shopPhone: row.phone || "+91 98765 43210",
              address: row.address || "Chennai, Tamil Nadu",
              latitude: lat,
              longitude: lng,
              vehicleTypes: ["2w", "4w"],
              specializations: rawServices.length > 0 ? rawServices : ["General service", "Brake Check", "Oil Change", "Engine"],
              openTime: "08:00",
              closeTime: "21:00",
              rating: 4.8,
              reviewCount: 24,
              photos: ["/images/workshop-1.jpg"],
              isVerified: true,
              availabilityStatus: "available",
              priceMin: 299,
              priceMax: 2000,
              yearsExperience: 6,
              distanceKm: Math.max(0.5, Math.round(dist * 10) / 10),
              etaMinutes: Math.max(5, Math.round(dist * 3.5 + 2)),
              isOpen: true,
              city: "Chennai",
              isRegisteredOwner: true,
            };
          });

          mappedShops.sort((a, b) => a.distanceKm - b.distanceKm);
          setShops(mappedShops);
        } else {
          // Fallback to local API
          const q = new URLSearchParams({
            lat: String(position.latitude),
            lng: String(position.longitude),
            radius: String(rad),
          });
          const data = await apiRequest<{ shops: MechanicView[] }>(`/api/mechanics?${q.toString()}`);
          if (data.shops && data.shops.length > 0) {
            setShops(data.shops);
          }
        }
      } catch {
        // Safe fallback
      } finally {
        setLoadingShops(false);
      }
    },
    [radiusKm]
  );

  useEffect(() => {
    if (firstLocationRender.current) {
      firstLocationRender.current = false;
      return;
    }
    void refreshShops(location);
  }, [location, refreshShops]);

  // Reverse geocoding helper to resolve actual area/locality name
  const fetchAreaName = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
        { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(4500) }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.road ||
          addr.village ||
          addr.town ||
          addr.city_district ||
          addr.city;
        const city = addr.city || addr.town || addr.county || addr.state_district;
        if (area && city && area !== city) {
          return `${area}, ${city}`;
        }
        return area || city || "Live GPS Location";
      }
    } catch {}
    return "Live GPS Location";
  };

  const detectLocation = useCallback(
    (targetView?: View) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        say("GPS location is not supported on this device.");
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const areaLabel = await fetchAreaName(lat, lng);
          const newLoc: MapLocation = {
            latitude: lat,
            longitude: lng,
            label: areaLabel,
            source: "gps",
          };
          setLocation(newLoc);
          setGeoLoading(false);
          try {
            localStorage.setItem("userSavedLocation", JSON.stringify(newLoc));
          } catch {}
          say(`Live GPS: ${areaLabel}`);
          if (targetView) setView(targetView);
          void refreshShops(newLoc);
        },
        (err) => {
          setGeoLoading(false);
          if (err.code === 1) {
            say("Please allow Location permission in your browser to detect your live location.");
          } else {
            say("Could not acquire GPS coordinates. Tap to retry.");
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    },
    [refreshShops, say]
  );

  // Trigger live GPS detection automatically on initial mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const initiateCall = useCallback(
    (shop: MechanicView) => {
      if (!shop) return;
      const phoneToCall = shop.phone || shop.shopPhone || "+919876543210";
      const clean = cleanPhoneNumber(phoneToCall);
      const telUri = `tel:${clean}`;

      if (isMobileDevice()) {
        window.location.href = telUri;
      } else {
        try {
          window.location.href = telUri;
        } catch {}
        setCallingShop(shop);
      }
    },
    []
  );

  async function handleSendRescueRequest(e: FormEvent) {
    e.preventDefault();
    if (!requestingShop) return;
    const cleanDigits = rescuePhone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      say("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSubmittingRescue(true);
    try {
      void supabase.from("rescue_requests").insert({
        user_phone: rescuePhone.trim(),
        vehicle_type: rescueVehicle,
        problem: rescueProblem,
        lat: location.latitude,
        lng: location.longitude,
        status: "pending",
      });

      const res = await apiRequest<{ success: boolean; breakdown: any }>("/api/breakdowns", jsonOptions({
        mechanicId: requestingShop.id,
        action: "request",
        issue: rescueProblem,
        vehicleType: rescueVehicle,
        userName: rescueName.trim() || userName,
        userPhone: rescuePhone.trim(),
        notes: rescueNotes.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
      setRequestingShop(null);
      setRescueNotes("");
      setActiveRescue(res.breakdown);
      say("Rescue request sent! The mechanic has been notified.");
    } catch (err) {
      say((err as Error).message);
    } finally {
      setSubmittingRescue(false);
    }
  }

  function goTo(next: View) {
    if (next === "register-shop" && user?.role === "customer") {
      say("Workshop registration & management is for registered mechanics only.");
      setView("home");
      return;
    }
    if ((next === "booking" || next === "rescue") && user?.role === "mechanic") {
      say("Mechanics manage repair jobs from their Workshop Dashboard.");
      setView("register-shop");
      return;
    }
    setView(next);
    setMobileMenuOpen(false);
    setNotificationOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const initiateWhatsAppRescue = useCallback(
    (shop: MechanicView) => {
      if (!shop) return;
      const targetPhone = shop.phone || shop.shopPhone || "+919876543210";
      const uri = getWhatsAppRescueUri(targetPhone, {
        shopName: shop.shopName,
        userName,
        userPhone,
        vehicle: rescueVehicle === "bike" ? "Motorcycle / 2W" : "Car / 4W",
        problem: `${rescueProblem} (Est. ₹${RESCUE_PRICE_ESTIMATES[rescueProblem] || 199})`,
        latitude: location.latitude,
        longitude: location.longitude,
        locationLabel: location.label,
        notes: rescueNotes || undefined,
      });

      // Background tracking log
      void supabase.from("rescue_requests").insert({
        user_phone: userPhone,
        vehicle_type: rescueVehicle,
        problem: rescueProblem,
        lat: location.latitude,
        lng: location.longitude,
        status: "requested",
      });

      say(`Opening WhatsApp with GPS dispatch link for ${shop.shopName}...`);
      window.open(uri, "_blank");
    },
    [location, rescueNotes, rescueProblem, rescueVehicle, say, userName, userPhone]
  );

  const startRescueDispatchEngine = useCallback(
    (shop: MechanicView) => {
      const price = RESCUE_PRICE_ESTIMATES[rescueProblem] || 249;
      const refId = `RES-${Math.floor(100000 + Math.random() * 900000)}`;

      const newBooking = {
        id: refId,
        referenceId: refId,
        service: `Roadside Rescue: ${rescueProblem}`,
        garage: shop.shopName,
        date: "Today (Emergency Live)",
        status: "Requested",
        total: price,
        bike: `${rescueVehicle === "bike" ? "Motorcycle (2W)" : "Car (4W)"} · ${rescueProblem}`,
        mechanic: {
          name: shop.ownerName || "Ravi Kumar",
          phone: shop.phone || shop.shopPhone || "+91 98765 43210",
        },
      };

      setActiveBooking(newBooking);
      try {
        localStorage.setItem("activeBooking", JSON.stringify(newBooking));
      } catch {}

      say(`🚨 Rescue dispatched to ${shop.shopName}! Connecting with mechanic...`);
      goTo("track");

      void apiRequest<{ success: boolean; breakdown: any }>("/api/breakdowns", jsonOptions({
        mechanicId: shop.id,
        action: "request",
        issue: rescueProblem,
        vehicleType: rescueVehicle,
        userName,
        userPhone,
        latitude: location.latitude,
        longitude: location.longitude,
        description: rescueNotes || undefined,
        photoUrl: rescuePhoto || undefined,
        spareParts: shop.spareParts || undefined,
      })).then((res) => {
        if (res && res.breakdown && res.breakdown.id) {
          setActiveBooking((prev: any) => prev ? { ...prev, breakdownDbId: res.breakdown.id } : prev);
        }
      }).catch(() => {});

      // Live dispatch fallback progression
      setTimeout(() => {
        setActiveBooking((prev: any) => prev ? { ...prev, status: "Accepted" } : prev);
        say(`✅ ${shop.ownerName} accepted your rescue request! Preparing tools.`);
      }, 4000);

      setTimeout(() => {
        setActiveBooking((prev: any) => prev ? { ...prev, status: "On the way" } : prev);
        say(`🛵 ${shop.ownerName} is on the way!`);
      }, 12000);

      setTimeout(() => {
        setActiveBooking((prev: any) => prev ? { ...prev, status: "Arrived" } : prev);
        say(`📍 Mechanic arrived at your breakdown location!`);
      }, 26000);
    },
    [location, rescueNotes, rescuePhoto, rescueProblem, rescueVehicle, say, userName, userPhone]
  );

  const handleCancelBooking = useCallback(async () => {
    if (!activeBooking) return;
    try {
      if (activeBooking.breakdownDbId) {
        await fetch("/api/breakdowns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeBooking.breakdownDbId, status: "cancelled" }),
        });
      }
    } catch {}
    setActiveBooking(null);
    try {
      localStorage.removeItem("activeBooking");
    } catch {}
    say("Service rescue request was cancelled.");
    goTo("home");
  }, [activeBooking, goTo, say]);

  // Live status synchronization with backend for active request
  useEffect(() => {
    if (!activeBooking?.breakdownDbId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/breakdowns?id=${activeBooking.breakdownDbId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.breakdown) {
            const b = data.breakdown;
            let mappedStatus = activeBooking.status;
            if (b.status === "pending") mappedStatus = "Requested";
            else if (b.status === "accepted") mappedStatus = "Accepted";
            else if (b.status === "arriving") mappedStatus = "On the way";
            else if (b.status === "arrived") mappedStatus = "Arrived";
            else if (b.status === "repairing") mappedStatus = "In Progress";
            else if (b.status === "completed") mappedStatus = "Fixed / Completed";
            else if (b.status === "cancelled") mappedStatus = "Cancelled";

            setActiveBooking((prev: any) =>
              prev
                ? {
                    ...prev,
                    status: mappedStatus,
                    mechanicLat: b.mechanicLat,
                    mechanicLng: b.mechanicLng,
                    etaMinutes: b.etaMinutes,
                  }
                : null
            );
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBooking?.breakdownDbId]);

  const selectedShop = shops.find((s) => s.id === selectedId) || null;
  const unreadCount = notices.filter((n) => !n.isRead).length;

  // 1. Splash Loader while verifying auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#FFFFFF] flex flex-col items-center justify-center font-['DM_Sans',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3 shadow-sm">
          <Image src="/images/sevaigo-logo.png" alt="SevaiGo" width={42} height={42} priority />
        </div>
        <div className="w-6 h-6 border-2 border-[#FF7900] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. FIRST TIME / SIGNED OUT VIEW: Exactly 2 login options (Customer Login & Mechanic Login)
  if (!isLoggedIn || !user) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onRegisterWorkshop={() => {
          setIsLoggedIn(true);
          const mechUser = {
            id: `u-mech-${Date.now()}`,
            name: "Mechanic",
            phone: "",
            email: "partner@sevaigo.local",
            role: "mechanic" as const,
          };
          setUser(mechUser);
          setView("register-shop");
        }}
      />
    );
  }

  // 3. CUSTOMER VIEW: Dedicated Customer Rescue Dashboard (Only breakdown rescue, GPS, 2W/4W, Issue, Photo, Real Mechanics <= 7km, Spare parts)
  if (user?.role === "customer") {
    return (
      <CustomerDashboard
        user={user}
        onLogout={handleFullLogout}
        toastMessage={say}
      />
    );
  }

  // 4. MECHANIC VIEW: Mechanic Workshop Portal (Registration & Incoming Live Requests)
  if (user?.role === "mechanic") {
    return (
      <RegisterShopFlow
        initialUser={user}
        onBack={handleFullLogout}
      />
    );
  }

  // MODALS & OVERLAYS RENDERER
  const renderModals = () => (
    <>
      <SparePartsModal
        isOpen={sparePartsOpen}
        onClose={() => setSparePartsOpen(false)}
        onSelectPart={(part) => {
          say(`Added "${part}" to your requested service items.`);
          setSparePartsOpen(false);
        }}
      />

      <OffersModal
        isOpen={offersOpen}
        onClose={() => setOffersOpen(false)}
        onApplyCode={(code) => {
          say(`Coupon "${code}" applied to your booking!`);
          setOffersOpen(false);
        }}
      />

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        onEmergencyRescue={() => {
          setHelpOpen(false);
          goTo("rescue");
        }}
      />

      {/* Shop Detail Modal */}
      {selectedShop && (
        <ShopDetail
          shop={selectedShop}
          language={language}
          isSaved={favoriteIds.includes(selectedShop.id)}
          user={user}
          reviews={reviews}
          reviewSubmitting={reviewSubmitting}
          onClose={() => setSelectedId(null)}
          onFavorite={(s) => {
            const fav = !favoriteIds.includes(s.id);
            setFavoriteIds((prev) => (fav ? [...prev, s.id] : prev.filter((id) => id !== s.id)));
            say(fav ? "Saved to favorites." : "Removed from favorites.");
          }}
          onCall={initiateCall}
          onNavigate={(s) => window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`, "_blank")}
          onShare={(s) => {
            if (navigator.share) {
              navigator.share({ title: s.shopName, url: window.location.href });
            } else {
              say("Workshop details copied.");
            }
          }}
          onSubmitReview={async () => {
            say("Thank you for submitting your review!");
            return true;
          }}
          onAuth={() => setAuthOpen(true)}
        />
      )}

      {/* Desktop Call Helper Modal */}
      {callingShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setCallingShop(null); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-[#121820] border border-white/10 p-5 text-center text-white shadow-2xl">
            <button
              onClick={() => setCallingShop(null)}
              className="absolute top-4 right-4 text-[#A5ADB8] hover:text-white"
            >
              <X size={18} />
            </button>
            <div className="w-14 h-14 rounded-full bg-[#FF7900]/20 text-[#FF7900] mx-auto flex items-center justify-center mb-3">
              <Phone size={26} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">{callingShop.shopName}</h3>
            <p className="text-xs text-[#A5ADB8] mb-4">Owner: {callingShop.ownerName}</p>

            <div className="p-3 rounded-xl bg-[#0D1117] border border-white/10 text-lg font-mono font-bold text-[#FF7900] mb-4">
              {formatPhoneDisplay(callingShop.phone || callingShop.shopPhone)}
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={getTelUri(callingShop.phone || callingShop.shopPhone) || "#"}
                className="py-3 px-4 rounded-xl bg-[#FF7900] text-white font-bold text-xs uppercase tracking-wider"
              >
                Launch Phone App
              </a>
              <a
                href={
                  getWhatsAppRescueUri(callingShop.phone || callingShop.shopPhone, {
                    shopName: callingShop.shopName,
                    userName,
                    userPhone,
                    vehicle: rescueVehicle === "bike" ? "Motorcycle / 2W" : "Car / 4W",
                    problem: `${rescueProblem} (Est. ₹${RESCUE_PRICE_ESTIMATES[rescueProblem] || 199})`,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    locationLabel: location.label,
                  }) || getWhatsAppUri(callingShop.phone || callingShop.shopPhone) || "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={15} /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#121820]/95 border border-[#FF7900]/40 text-white text-xs font-semibold shadow-[0_10px_30px_rgba(255,121,0,0.35)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-[#FF7900]" />
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="text-[#A5ADB8] hover:text-white ml-1">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );

  // 5. NEARBY GARAGES VIEW
  if (view === "garages") {
    return (
      <BikeBackground scene="garage" opacity={0.35}>
        <NearbyGaragesView
          onBack={() => goTo("home")}
          shops={shops}
          location={location}
          onBookShop={(shop) => {
            goTo("booking");
          }}
          onCallShop={initiateCall}
        />
        {renderModals()}
      </BikeBackground>
    );
  }

  // 4. STEP-BY-STEP BOOKING FLOW
  if (view === "booking") {
    if (user?.role === "mechanic") {
      return (
        <BikeBackground scene="garage" opacity={0.4}>
          <div className="w-full max-w-md mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#FF7900] flex items-center justify-center mx-auto mb-4 border border-orange-200 shadow-sm">
              <Store size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 font-['Manrope'] mb-2">Mechanic Portal</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              As a registered mechanic, you receive and manage customer repair bookings directly from your Workshop Dashboard.
            </p>
            <button
              onClick={() => goTo("register-shop")}
              className="px-6 py-3 rounded-xl bg-[#FF7900] text-white font-bold text-sm shadow-md hover:bg-[#E56D00] transition-colors"
            >
              Open Workshop Dashboard
            </button>
          </div>
          {renderModals()}
        </BikeBackground>
      );
    }
    return (
      <BikeBackground scene="garage" opacity={0.4}>
        <ServiceBookingFlow
          nearbyShops={shops}
          userPhone={userPhone}
          userName={userName}
          onBack={() => goTo("home")}
          onBookingComplete={(newBooking) => {
            setActiveBooking(newBooking);
            goTo("track");
            say(`Booking confirmed! Reference: ${newBooking.referenceId}`);
          }}
        />
        {renderModals()}
      </BikeBackground>
    );
  }

  // 5. TRACK SERVICE TIMELINE
  if (view === "track") {
    return (
      <BikeBackground scene="studio" opacity={0.35}>
        <TrackServiceView
          booking={activeBooking}
          onBack={() => goTo("home")}
          onLiveTracking={() => goTo("live-tracking")}
          onCancel={handleCancelBooking}
        />
        {renderModals()}
      </BikeBackground>
    );
  }

  // 6. LIVE ROUTE & MECHANIC TRACKING
  if (view === "live-tracking") {
    return (
      <BikeBackground scene="studio" opacity={0.3}>
        <LiveTrackingView
          booking={activeBooking}
          onBack={() => goTo("track")}
          onCancel={handleCancelBooking}
        />
        {renderModals()}
      </BikeBackground>
    );
  }

  // 7. USER PROFILE
  if (view === "profile") {
    return (
      <BikeBackground scene="profile" opacity={0.4}>
        <ProfileView
          user={user || (userPhone ? { id: `u-${userPhone}`, name: userName || `Rider ${userPhone.slice(-4)}`, phone: userPhone, email: `+91 ${userPhone}`, role: "rider" } : null)}
          onNavigate={(target) => goTo(target as View)}
          onLogout={handleFullLogout}
          onOpenOffers={() => setOffersOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
        />
        {renderModals()}
      </BikeBackground>
    );
  }

  // 8. ROADSIDE EMERGENCY RESCUE WIZARD
  if (view === "rescue") {
    return (
      <BikeBackground scene="sunset" opacity={0.35}>
        <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => goTo("home")}
              className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-extrabold text-white tracking-tight font-['Manrope']">
              Breakdown Assistance
            </h1>
            <div className="w-10" />
          </div>

          {/* Rescue Form */}
          <div className="space-y-4">
            {/* Step 1: Location */}
            <div className="p-5 rounded-2xl bg-[#121820] border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-white">Your Breakdown Location</h3>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => detectLocation()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LocateFixed size={15} className="text-[#FF7900]" />
                  <span>{geoLoading ? "Detecting GPS..." : "Detect GPS Coordinates"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRescueMap(!showRescueMap)}
                  className="py-2.5 px-3 rounded-xl bg-[#0D1117] hover:bg-white/5 border border-white/15 text-xs font-bold text-[#A5ADB8] hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MapPin size={14} className="text-[#FF7900]" />
                  <span>{showRescueMap ? "Hide Map" : "View Map"}</span>
                </button>
              </div>
              <div className="text-xs text-[#A5ADB8] p-2.5 rounded-lg bg-[#0D1117] border border-white/5 flex items-center gap-2">
                <MapPin size={14} className="text-[#FF7900] shrink-0" />
                <span className="truncate">{location.label}</span>
              </div>
              {showRescueMap && (
                <div className="mt-3 h-52 rounded-xl overflow-hidden border border-white/10 relative">
                  <MechanicMap
                    location={location}
                    shops={shops.slice(0, 5)}
                    selectedId={null}
                  />
                </div>
              )}
            </div>

            {/* Step 2: Vehicle Type */}
            <div className="p-5 rounded-2xl bg-[#121820] border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="text-sm font-bold text-white">Vehicle Type</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "bike" as const, label: "Bike / 2W", icon: Bike },
                  { id: "car" as const, label: "Car / 4W", icon: CarFront },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRescueVehicle(item.id)}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      rescueVehicle === item.id
                        ? "bg-[#FF7900]/20 border-[#FF7900] text-white"
                        : "bg-[#0D1117] border-white/10 text-[#A5ADB8]"
                    }`}
                  >
                    <item.icon size={18} className={rescueVehicle === item.id ? "text-[#FF7900]" : ""} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Problem & Transparent Price */}
            <div className="p-5 rounded-2xl bg-[#121820] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="text-sm font-bold text-white">Breakdown Issue</h3>
                </div>
                <span className="text-[11px] font-semibold text-[#FF7900]">Fixed Price Estimate</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "Puncture", label: "Puncture", price: 150 },
                  { id: "Battery", label: "Battery Jump", price: 299 },
                  { id: "Starting Problem", label: "Starting Issue", price: 249 },
                  { id: "Fuel Issue", label: "Emergency Fuel", price: 199 },
                  { id: "Engine", label: "Engine Breakdown", price: 399 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRescueProblem(item.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      rescueProblem === item.id
                        ? "bg-[#FF7900]/20 border-[#FF7900] text-white shadow-[0_0_12px_rgba(255,121,0,0.3)]"
                        : "bg-[#0D1117] border-white/10 text-[#A5ADB8] hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold truncate text-white">{item.label}</div>
                    <div className={`text-[11px] font-mono mt-0.5 ${rescueProblem === item.id ? "text-[#FF7900] font-bold" : "text-[#A5ADB8]"}`}>
                      ₹{item.price}
                    </div>
                  </button>
                ))}
              </div>

              {/* Problem Description */}
              <div className="mt-3.5 pt-3 border-t border-white/5">
                <label className="text-xs font-bold text-white block mb-1.5">
                  Describe Bike Problem (Optional)
                </label>
                <textarea
                  value={rescueNotes}
                  onChange={(e) => setRescueNotes(e.target.value)}
                  placeholder="e.g. Rear tyre got punctured, engine stalled after rain, clutch cable broken..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#0D1117] border border-white/10 text-xs text-white placeholder:text-[#A5ADB8]/60 focus:outline-none focus:border-[#FF7900]"
                />
              </div>

              {/* Photo Upload */}
              <div className="mt-3">
                <label className="text-xs font-bold text-white block mb-1.5">
                  Attach Photo of Bike / Breakdown (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="py-2 px-3 rounded-xl bg-[#0D1117] border border-white/15 hover:border-[#FF7900]/50 text-xs font-bold text-[#A5ADB8] hover:text-white flex items-center gap-2 cursor-pointer transition-colors">
                    <Camera size={15} className="text-[#FF7900]" />
                    <span>{rescuePhoto ? "Change Photo" : "Upload / Take Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setRescuePhoto(reader.result as string);
                            say("Photo attached to rescue request!");
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {rescuePhoto && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#FF7900]/60 shadow">
                      <img src={rescuePhoto} alt="Breakdown Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRescuePhoto("")}
                        className="absolute top-0.5 right-0.5 bg-black/80 rounded-full p-0.5 text-white hover:bg-black cursor-pointer"
                        title="Remove photo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4: Dispatch Nearby Mechanic (Top 5 Mechanics) */}
            <div className="p-5 rounded-2xl bg-[#121820] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-xs font-bold">4</span>
                  <h3 className="text-sm font-bold text-white">Nearest Available Mechanics</h3>
                </div>
                <span className="text-[11px] text-[#A5ADB8]">Top 5 Nearby</span>
              </div>
              <div className="space-y-3">
                {shops.slice(0, 5).map((shop) => (
                  <div key={shop.id} className="p-3.5 rounded-xl bg-[#0D1117] border border-white/5 flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{shop.shopName}</h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Mechanic Online" />
                        </div>
                        <p className="text-xs text-[#A5ADB8]">{shop.distanceKm.toFixed(1)} km away · {shop.ownerName}</p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => initiateWhatsAppRescue(shop)}
                          className="py-1.5 px-2.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          title="Send exact live GPS breakdown pin on WhatsApp"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => initiateCall(shop)}
                          className="py-1.5 px-2.5 rounded-lg bg-[#121820] border border-white/15 hover:border-white/30 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Phone size={14} /> Call
                        </button>
                        <button
                          type="button"
                          onClick={() => startRescueDispatchEngine(shop)}
                          className="py-1.5 px-2.5 rounded-lg bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <Zap size={14} /> Book
                        </button>
                      </div>
                    </div>

                    {/* Spare Parts in stock badge */}
                    {shop.spareParts && shop.spareParts.length > 0 && (
                      <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-[#A5ADB8]">Parts in stock:</span>
                        {shop.spareParts.map((sp) => (
                          <span key={sp} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white font-medium">
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {renderModals()}
      </BikeBackground>
    );
  }


  // 10. ACTIVITY / BOOKINGS VIEW
  if (view === "activity") {
    return (
      <BikeBackground scene="studio" opacity={0.35}>
        <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => goTo("home")}
              className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-extrabold text-white font-['Manrope']">My Bookings</h1>
            <div className="w-10" />
          </div>

          <div className="space-y-3.5">
            {activeBooking && (
              <div className="p-4 rounded-2xl bg-[#121820] border border-[#FF7900]/40 shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF7900]">{activeBooking.referenceId}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF7900]/20 text-[#FF7900] text-[10px] font-bold">
                    {activeBooking.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeBooking.service}</h3>
                  <p className="text-xs text-[#A5ADB8]">{activeBooking.bike} · {activeBooking.date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goTo("track")}
                  className="w-full py-2.5 rounded-xl bg-[#FF7900] text-white text-xs font-bold uppercase tracking-wider"
                >
                  Track Service
                </button>
              </div>
            )}
          </div>
        </div>
        {renderModals()}
      </BikeBackground>
    );
  }

  // ==========================================
  // 11. MAIN HOME DASHBOARD (Exact Match to Screen 3 in Reference Image)
  // ==========================================
  return (
    <BikeBackground scene="garage" opacity={0.4}>
      {/* Mobile Sidebar Scrim & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#FFFFFF] border-r border-[#E2E8F0] p-6 flex flex-col justify-between z-10 text-slate-900 shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              {/* Brand Header */}
              <div className="flex items-center justify-between pb-6 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-200 shadow-md">
                    <Image
                      src="/images/sevaigo-logo.png"
                      alt="SevaiGo Logo"
                      width={40}
                      height={40}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-['Manrope'] leading-none text-slate-900">
                      Sevai<span className="text-[#FF7900]">Go</span>
                    </h2>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {user?.role === "mechanic" ? "Mechanic Portal" : "Precision Moto Care"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Items (Role filtered) */}
              <nav className="py-6 space-y-1.5">
                {(user?.role === "mechanic"
                  ? [
                      { view: "register-shop" as const, label: "Workshop Dashboard", icon: Store },
                      { view: "garages" as const, label: "Nearby Garages & Map", icon: MapPin },
                      { view: "track" as const, label: "Track Service", icon: Navigation },
                      { view: "profile" as const, label: "My Profile", icon: User },
                    ]
                  : [
                      { view: "home" as const, label: "Home Dashboard", icon: Store },
                      { view: "booking" as const, label: "Book a Service", icon: Wrench },
                      { view: "garages" as const, label: "Nearby Garages & Map", icon: MapPin },
                      { view: "track" as const, label: "Track Service", icon: Navigation },
                      { view: "rescue" as const, label: "Roadside Rescue (SOS)", icon: Zap },
                      { view: "activity" as const, label: "My Bookings", icon: Calendar },
                      { view: "profile" as const, label: "My Profile & Bikes", icon: User },
                    ]
                ).map((item) => {
                  const Icon = item.icon;
                  const isActive = view === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => goTo(item.view)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#FF7900] text-white shadow-[0_4px_15px_rgba(255,121,0,0.35)]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Language</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${language === "en" ? "bg-[#FF7900] text-white" : "text-slate-600 bg-slate-100"}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage("ta")}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${language === "ta" ? "bg-[#FF7900] text-white" : "text-slate-600 bg-slate-100"}`}
                  >
                    தமிழ்
                  </button>
                </div>
              </div>

              <button
                onClick={handleFullLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 border border-red-200 transition-colors"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Container */}
      <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
        {/* Top Section Header: Menu, Logo, Notification (Exact match to Screen 3) */}
        <header className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Center Brand Wordmark */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => goTo("home")}>
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-md">
              <Image
                src="/images/sevaigo-logo.png"
                alt="SevaiGo Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="text-xl font-black font-['Manrope'] tracking-tight text-white">
              Sevai<span className="text-[#FF7900]">Go</span>
            </span>
          </div>

          {/* Right Notification Bell */}
          <button
            type="button"
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#FF7900] ring-2 ring-[#121820]" />
            )}
          </button>
        </header>

        {/* Notifications Popover Dropdown */}
        {notificationOpen && (
          <div className="mb-4 p-4 rounded-2xl bg-[#121820] border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Service Alerts</span>
              <button onClick={() => setNotificationOpen(false)} className="text-[#A5ADB8] hover:text-white text-xs">Close</button>
            </div>
            <div className="space-y-2">
              {notices.map((n) => (
                <div key={n.id} className="p-2.5 rounded-xl bg-[#0D1117] border border-white/5 text-xs">
                  <div className="font-bold text-white">{n.title}</div>
                  <div className="text-[#A5ADB8] mt-0.5">{n.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* App Title & GPS Location Bar */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white font-['Manrope'] tracking-tight flex items-center gap-2">
              <span>Sevai<span className="text-[#FF7900]">Go</span></span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/30 tracking-wider uppercase">Rescue</span>
            </h1>
            <p className="text-xs text-[#A5ADB8] mt-0.5">
              Instant roadside motorcycle rescue & verified mechanics nearby
            </p>
          </div>

          {/* Location Chip */}
          <button
            type="button"
            onClick={() => detectLocation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121820] border border-white/10 text-xs text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
            title="Click to detect current GPS location"
          >
            <MapPin size={13} className="text-[#FF7900]" />
            <span className="max-w-[120px] truncate">{location.label.split(",")[0] || "GPS Location"}</span>
          </button>
        </div>

        {/* Two Clear Options Tailored to Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {user?.role === "mechanic" ? (
            <>
              {/* Mechanic Option 1: Workshop Dashboard */}
              <button
                type="button"
                onClick={() => goTo("register-shop")}
                className="group relative overflow-hidden p-5 rounded-2xl bg-white border-2 border-[#FF7900]/40 hover:border-[#FF7900] transition-all duration-300 text-left shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FF7900] text-white flex items-center justify-center shadow-lg shadow-[#FF7900]/25 group-hover:scale-105 transition-transform duration-200">
                    <Store size={24} strokeWidth={2.4} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF7900]/10 text-[#FF7900] border border-[#FF7900]/30 text-[10px] font-extrabold tracking-wider uppercase">
                    Mechanic Portal
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 font-['Manrope'] mb-1 flex items-center gap-2">
                  <span>Workshop Dashboard</span>
                  <ArrowRight size={18} className="text-[#FF7900] group-hover:translate-x-1 transition-transform duration-200" />
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  View incoming rescue calls, toggle Online/Offline availability, and update workshop pricing & info.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF7900]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>Live Dispatch • Shop Profile • Rescue Alerts</span>
                </div>
              </button>

              {/* Mechanic Option 2: Explore Network Garages */}
              <button
                type="button"
                onClick={() => goTo("garages")}
                className="group relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#FF7900]/60 transition-all duration-300 text-left shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-[#FF7900] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                    <MapPin size={24} strokeWidth={2.2} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold tracking-wider uppercase">
                    Directory
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 font-['Manrope'] mb-1 flex items-center gap-2">
                  <span>Certified Garages</span>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-[#FF7900] group-hover:translate-x-1 transition-transform duration-200" />
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Browse verified peer garages and partner workshops across Tamil Nadu on the live map.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 group-hover:text-[#FF7900] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Partner Network • Live Map • Ratings</span>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Customer Option 1: I Need a Mechanic */}
              <button
                type="button"
                onClick={() => goTo("rescue")}
                className="group relative overflow-hidden p-5 rounded-2xl bg-white border-2 border-[#FF7900]/40 hover:border-[#FF7900] transition-all duration-300 text-left shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FF7900] text-white flex items-center justify-center shadow-lg shadow-[#FF7900]/25 group-hover:scale-105 transition-transform duration-200">
                    <Wrench size={24} strokeWidth={2.4} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF7900]/10 text-[#FF7900] border border-[#FF7900]/30 text-[10px] font-extrabold tracking-wider uppercase">
                    Rescue Me
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 font-['Manrope'] mb-1 flex items-center gap-2">
                  <span>I Need a Mechanic</span>
                  <ArrowRight size={18} className="text-[#FF7900] group-hover:translate-x-1 transition-transform duration-200" />
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Puncture, battery, or breakdown? Get nearby mechanics dispatched to your live GPS coordinates.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF7900]">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                  <span>Live GPS • Direct Call • Track Live</span>
                </div>
              </button>

              {/* Customer Option 2: Explore Certified Garages */}
              <button
                type="button"
                onClick={() => goTo("garages")}
                className="group relative overflow-hidden p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#FF7900]/60 transition-all duration-300 text-left shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-[#FF7900] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                    <Store size={24} strokeWidth={2.2} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold tracking-wider uppercase">
                    Garages
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 font-['Manrope'] mb-1 flex items-center gap-2">
                  <span>Certified Garages</span>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-[#FF7900] group-hover:translate-x-1 transition-transform duration-200" />
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Find top-rated workshops nearby, check transparent repair prices, read real rider reviews, and book.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 group-hover:text-[#FF7900] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span>Verified Shops • Real Reviews • Upfront Rates</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Quick Utilities Row */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { id: "track", title: "Track", icon: Navigation, action: () => goTo("track") },
            { id: "garages", title: "Garages", icon: MapPin, action: () => goTo("garages") },
            { id: "parts", title: "Spares", icon: Package, action: () => setSparePartsOpen(true) },
            { id: "help", title: "Help", icon: HelpCircle, action: () => setHelpOpen(true) },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="p-3 rounded-xl bg-[#121820] hover:bg-[#18202A] border border-white/10 hover:border-[#FF7900]/40 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FF7900]/15 text-[#FF7900] flex items-center justify-center">
                  <Icon size={16} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-white text-center">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Booking Banner (if exists) */}
        {activeBooking && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#121820] via-[#1a232f] to-[#121820] border border-[#FF7900]/30 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center shrink-0">
                <Bike size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#FF7900]">{activeBooking.referenceId}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF7900]/15 text-[#FF7900]">
                    In Progress
                  </span>
                </div>
                <p className="text-xs text-[#A5ADB8] mt-0.5">
                  {activeBooking.bike} · Expected in 45 mins
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => goTo("track")}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
            >
              Track
            </button>
          </div>
        )}

        {/* Popular Services Section (Exact match to Screen 3) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base font-extrabold text-white font-['Manrope'] tracking-tight">
              Popular Services
            </h2>
            <button
              type="button"
              onClick={() => goTo("booking")}
              className="text-xs font-bold text-[#FF7900] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {POPULAR_SERVICES_HOME.map((serv) => (
              <div
                key={serv.id}
                onClick={() => goTo("booking")}
                className="group p-3.5 rounded-2xl bg-[#121820] hover:bg-[#18202A] border border-white/10 hover:border-[#FF7900]/40 transition-all duration-200 flex items-center justify-between cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-[#FF7900]/20 text-[#A5ADB8] group-hover:text-[#FF7900] flex items-center justify-center transition-colors">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF7900] transition-colors">
                      {serv.title}
                    </h3>
                    <p className="text-xs text-[#A5ADB8]">
                      ₹{serv.price} onwards · {serv.duration}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#A5ADB8] group-hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Garages Near You Preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base font-extrabold text-white font-['Manrope'] tracking-tight">
              Nearby Garages
            </h2>
            <button
              type="button"
              onClick={() => goTo("garages")}
              className="text-xs font-bold text-[#FF7900] hover:underline cursor-pointer"
            >
              View On Map
            </button>
          </div>

          <div className="space-y-3">
            {shops.slice(0, 2).map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                language={language}
                isSaved={favoriteIds.includes(shop.id)}
                onOpen={(s) => setSelectedId(s.id)}
                onFavorite={(s) => {
                  const fav = !favoriteIds.includes(s.id);
                  setFavoriteIds((prev) => (fav ? [...prev, s.id] : prev.filter((id) => id !== s.id)));
                  say(fav ? "Saved workshop." : "Removed workshop.");
                }}
                onCall={initiateCall}
              />
            ))}
          </div>
        </div>

        {/* Slogan Footer Banner */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm text-center my-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF7900] tracking-wider uppercase mb-1">
            <Sparkles size={14} />
            <span>Every Ride Deserves The Best</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Quick Service · Trusted Mechanics · Always Nearby
          </p>
        </div>
      </div>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] py-2 px-6 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        aria-label="Bottom Navigation"
      >
        {(user?.role === "mechanic"
          ? [
              { id: "register-shop" as const, label: "Workshop", icon: Store },
              { id: "garages" as const, label: "Garages", icon: MapPin },
              { id: "profile" as const, label: "Profile", icon: User },
            ]
          : [
              { id: "home" as const, label: "Home", icon: Store },
              { id: "garages" as const, label: "Garages", icon: MapPin },
              { id: "activity" as const, label: "Bookings", icon: Calendar },
              { id: "profile" as const, label: "Profile", icon: User },
            ]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => goTo(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors cursor-pointer ${
                isActive ? "text-[#FF7900]" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? "font-extrabold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {renderModals()}
    </BikeBackground>
  );
}
