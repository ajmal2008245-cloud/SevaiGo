"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Bike,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import HelpModal from "@/components/modals/HelpModal";
import type { PublicUser } from "@/lib/auth";
import type { MechanicView } from "@/lib/mechanic-shared";
import { DEMO_LOCATION } from "@/lib/mechanic-shared";
import { supabase } from "@/lib/supabaseClient";

const MechanicMap = dynamic(() => import("@/components/MechanicMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#EAF4FF]/40 animate-pulse flex items-center justify-center text-xs text-[#2F6B73] font-semibold">
      Loading map...
    </div>
  ),
});

interface CustomerDashboardProps {
  user: PublicUser;
  onLogout: () => void;
  toastMessage?: (msg: string) => void;
}

const COMMON_ISSUES = [
  { id: "Puncture", label: "Puncture / Flat Tyre", icon: Wrench, est: "₹150" },
  { id: "Battery", label: "Battery Dead / Jumpstart", icon: Sparkles, est: "₹299" },
  { id: "Starting Problem", label: "Starting Problem", icon: Clock, est: "₹249" },
  { id: "Engine", label: "Engine Breakdown", icon: AlertTriangle, est: "₹399" },
  { id: "Chain", label: "Chain Cut / Drive Issue", icon: Bike, est: "₹199" },
  { id: "Fuel", label: "Fuel Empty / Petrol Delivery", icon: Compass, est: "₹199" },
  { id: "Brakes", label: "Brake Failure / Jammed", icon: Wrench, est: "₹250" },
  { id: "Other", label: "Other Mechanical Issue", icon: FileText, est: "Inspect" },
];

export const SHOP_SPARE_PARTS = [
  { name: "Motul 4T 10W40 Engine Oil 1L", price: 380 },
  { name: "MRF Heavy Duty Tube", price: 280 },
  { name: "Tubeless Puncture Strip Kit", price: 150 },
  { name: "NGK Laser Spark Plug", price: 180 },
  { name: "Exide 12V 5Ah Battery", price: 1250 },
  { name: "Drive Chain Lube Spray", price: 220 },
];

// Great-circle distance helper (Haversine formula in km)
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function matchesVehicleType(supportedTypes: string[], requestedType: "2w" | "4w"): boolean {
  if (!supportedTypes || supportedTypes.length === 0) return true;
  if (requestedType === "2w") {
    return supportedTypes.some((t) => ["2w", "bike", "scooter", "motorcycle", "all"].includes(t.toLowerCase()));
  }
  return supportedTypes.some((t) => ["4w", "car", "van", "suv", "all"].includes(t.toLowerCase()));
}

export default function CustomerDashboard({
  user,
  onLogout,
  toastMessage,
}: CustomerDashboardProps) {
  // Navigation & Drawer State
  const [activeTab, setActiveTab] = useState<"dashboard" | "bookings" | "profile">("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // 1. Current Bike Breakdown Details State
  const [latitude, setLatitude] = useState<number>(DEMO_LOCATION.latitude);
  const [longitude, setLongitude] = useState<number>(DEMO_LOCATION.longitude);
  const [locationLabel, setLocationLabel] = useState<string>("Detecting live GPS location...");
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>("");
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [showBreakdownMap, setShowBreakdownMap] = useState<boolean>(false);

  // 2. Vehicle Type & Breakdown Issue
  const [vehicleType, setVehicleType] = useState<"2w" | "4w">("2w");
  const [issue, setIssue] = useState<string>("Puncture");
  const [notes, setNotes] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Spare Parts Selection Option
  const [selectedSpareParts, setSelectedSpareParts] = useState<string[]>([]);

  // 4. Real Registered Mechanics from Supabase (Cached)
  const [registeredShops, setRegisteredShops] = useState<MechanicView[]>([]);
  const [loadingShops, setLoadingShops] = useState<boolean>(true);
  const [submittingRescueId, setSubmittingRescueId] = useState<string | null>(null);
  const [requestedStatus, setRequestedStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const shopsCacheRef = useRef<Record<string, MechanicView[]>>({});

  // 5. Active Live Rescue Tracking State
  const [activeRescue, setActiveRescue] = useState<{
    id: string;
    breakdownId: string;
    shop: MechanicView;
    customerLat: number;
    customerLng: number;
    customerAddress: string;
    mechanicLat: number;
    mechanicLng: number;
    etaMinutes: number;
    distanceKm: number;
    status: "pending" | "accepted" | "on_the_way" | "arrived" | "completed";
    step: number;
    requestedAt: number;
  } | null>(null);

  const say = useCallback((msg: string) => {
    if (toastMessage) toastMessage(msg);
  }, [toastMessage]);

  // Load registered mechanics strictly from Supabase 'shops' table with indexed bounding box query
  const loadRegisteredMechanics = useCallback(async (userLat: number, userLng: number) => {
    const cacheKey = `${userLat.toFixed(3)}_${userLng.toFixed(3)}`;
    if (shopsCacheRef.current[cacheKey]) {
      setRegisteredShops(shopsCacheRef.current[cacheKey]);
      setLoadingShops(false);
      return;
    }

    setLoadingShops(true);
    setSearchError(null);

    try {
      const radiusKm = 7;
      const latDelta = radiusKm / 111.0;
      const lngDelta = radiusKm / (111.0 * Math.cos((userLat * Math.PI) / 180));

      // Query verified mechanics in the 7km bounding box from Supabase
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("verified", true)
        .gte("lat", userLat - latDelta)
        .lte("lat", userLat + latDelta)
        .gte("lng", userLng - lngDelta)
        .lte("lng", userLng + lngDelta);

      if (error) throw error;

      if (data) {
        const validItems = (data || []).filter((item: any) => {
          const shopLat = Number(item.lat ?? item.latitude);
          const shopLng = Number(item.lng ?? item.longitude);
          return (
            Number.isFinite(shopLat) &&
            Number.isFinite(shopLng) &&
            shopLat >= -90 &&
            shopLat <= 90 &&
            shopLng >= -180 &&
            shopLng <= 180
          );
        });

        const mapped: MechanicView[] = validItems
          .map((item: any): MechanicView => {
            const shopLat = Number(item.lat ?? item.latitude);
            const shopLng = Number(item.lng ?? item.longitude);
            const dist = distanceKm(userLat, userLng, shopLat, shopLng);
            const services: string[] = Array.isArray(item.services) ? item.services : [];
            const vTypes = services.filter((s: string) =>
              ["2w", "4w", "bike", "car", "auto", "truck"].includes(s.toLowerCase())
            );
            if (vTypes.length === 0) vTypes.push("2w", "4w");

            return {
              id: String(item.id),
              slug: item.slug || String(item.id),
              shopName: item.shop_name || "Mechanic Workshop",
              ownerName: item.owner_name || "Verified Mechanic",
              ownerPhoto: "/images/owner-1.jpg",
              phone: item.phone || "",
              shopPhone: item.phone || "",
              whatsapp: item.phone || "",
              additionalPhone: "",
              address: item.address || "Tamil Nadu, India",
              latitude: shopLat,
              longitude: shopLng,
              distanceKm: Math.round(dist * 10) / 10,
              etaMinutes: Math.max(2, Math.round(dist * 3.5)),
              rating: 4.9,
              reviewCount: 18,
              yearsExperience: 5,
              isOpen: true,
              priceMin: 150,
              priceMax: 600,
              openTime: "08:00 AM",
              closeTime: "10:00 PM",
              photos: ["/images/garage-1.jpg"],
              vehicleTypes: vTypes,
              specializations: services.length > 0 ? services : ["Emergency Roadside Assistance"],
              spareParts: ["Tubes", "Spark Plugs", "Engine Oil", "Brake Pads"],
              isVerified: true,
              availabilityStatus: "available",
            };
          })
          .filter((s) => s.distanceKm <= 7.0)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        shopsCacheRef.current[cacheKey] = mapped;
        setRegisteredShops(mapped);
      }
    } catch {
      // Fast fallback to /api/mechanics endpoint
      try {
        const res = await fetch(`/api/mechanics?lat=${userLat}&lng=${userLng}&radius=7`);
        const json = await res.json().catch(() => ({}));
        const list: MechanicView[] = json.shops || json.mechanics || [];
        const valid7km = list.filter((s) => s.distanceKm <= 7.0);
        shopsCacheRef.current[cacheKey] = valid7km;
        setRegisteredShops(valid7km);
      } catch {
        setSearchError("Network issue reaching mechanic discovery server. Please tap retry.");
      }
    } finally {
      setLoadingShops(false);
    }
  }, []);

  // Supabase Real-time: automatically refresh nearby mechanics when a shop registers/updates
  useEffect(() => {
    const channel = supabase
      .channel("customer-shops-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        () => {
          shopsCacheRef.current = {};
          loadRegisteredMechanics(latitude, longitude);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [latitude, longitude, loadRegisteredMechanics]);

  // Detect current GPS location without blocking mechanic discovery
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    setDetectingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocationLabel(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setDetectingGps(false);

        // Instantly trigger mechanic discovery at coordinates without waiting for reverse geocode!
        loadRegisteredMechanics(lat, lng);
        say("Live GPS coordinates detected!");

        // Reverse geocode in background for address label
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.display_name) {
              setLocationLabel(data.display_name);
            }
          })
          .catch(() => {});
      },
      (err) => {
        setDetectingGps(false);
        setLocationError("GPS location access was denied. Please allow location in your browser or search your breakdown area below.");
        // Still load current coordinates without freezing
        loadRegisteredMechanics(latitude, longitude);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [loadRegisteredMechanics, latitude, longitude, say]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // Autocomplete Area Search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearchQuery.trim()) return;
    setIsSearchingLocation(true);

    try {
      const q = encodeURIComponent(locationSearchQuery.trim() + ", Tamil Nadu, India");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLatitude(newLat);
        setLongitude(newLng);
        setLocationLabel(data[0].display_name);
        loadRegisteredMechanics(newLat, newLng);
        say(`Location synchronized: ${data[0].display_name.slice(0, 35)}...`);
      } else {
        say("Area not found. Please try another nearby landmark or town.");
      }
    } catch {
      say("Network error while searching location. Please retry.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handlePickBreakdownSpot = (coords: { latitude: number; longitude: number }) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
    setLocationLabel(`Pinned Spot: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
    loadRegisteredMechanics(coords.latitude, coords.longitude);
    say("Breakdown spot pinned on map!");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      say("Image is too large. Please select a photo under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      say("Breakdown photo attached.");
    };
    reader.readAsDataURL(file);
  };

  const toggleSparePart = (partName: string) => {
    setSelectedSpareParts((prev) =>
      prev.includes(partName) ? prev.filter((p) => p !== partName) : [...prev, partName]
    );
  };

  // WhatsApp Rescue Dispatch
  const triggerWhatsAppRescue = (shop: MechanicView) => {
    const phoneClean = shop.whatsapp || shop.phone || "9876543210";
    const sparePartsText =
      selectedSpareParts.length > 0 ? `\n*Requested Spare Parts:* ${selectedSpareParts.join(", ")}` : "";
    const notesText = notes.trim() ? `\n*Details:* ${notes.trim()}` : "";

    const msg =
      `*🚨 SevaiGo Emergency Roadside Breakdown Alert!*\n\n` +
      `*Customer Mobile:* ${user.phone ? `+91 ${user.phone}` : (user.email || "Customer")}\n` +
      `*Vehicle Type:* ${vehicleType === "2w" ? "2-Wheeler (Motorcycle/Scooter)" : "4-Wheeler (Car/Van)"}\n` +
      `*Breakdown Issue:* ${issue}\n` +
      `${sparePartsText}${notesText}\n` +
      `*Current Breakdown Location:* ${locationLabel}\n` +
      `*Live Map Pin:* https://www.google.com/maps?q=${latitude},${longitude}\n\n` +
      `Please accept and dispatch mechanic to this spot immediately.`;

    const url = `https://wa.me/91${phoneClean.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    say(`Opening WhatsApp to dispatch request to ${shop.shopName}...`);
  };

  // Submit Rescue Request
  const submitRescueRequest = async (shop: MechanicView) => {
    setSubmittingRescueId(shop.id);
    const initialDist = Math.round(distanceKm(latitude, longitude, shop.latitude, shop.longitude) * 10) / 10;
    const initialEta = Math.max(2, Math.round(initialDist * 3.5));

    try {
      const res = await fetch("/api/breakdowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          mechanicId: shop.id,
          userName: user.name || (user.phone ? `Rider ${user.phone.slice(-4)}` : "Rider"),
          userPhone: user.phone || "",
          vehicleType: vehicleType === "2w" ? "bike" : "car",
          issue,
          description: notes || undefined,
          latitude,
          longitude,
          photoUrl: photoPreview || undefined,
          spareParts: selectedSpareParts.length > 0 ? selectedSpareParts : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const breakdownDbId = data?.breakdown?.id || `res-${Date.now()}`;

      setActiveRescue({
        id: breakdownDbId,
        breakdownId: breakdownDbId,
        shop,
        customerLat: latitude,
        customerLng: longitude,
        customerAddress: locationLabel,
        mechanicLat: shop.latitude,
        mechanicLng: shop.longitude,
        etaMinutes: initialEta,
        distanceKm: initialDist,
        status: "on_the_way",
        step: 0,
        requestedAt: Date.now(),
      });

      if (res.ok) {
        setRequestedStatus(shop.id);
        say(`🚨 Rescue dispatched to ${shop.shopName}! Tracking live mechanic.`);
      } else {
        triggerWhatsAppRescue(shop);
      }
    } catch {
      triggerWhatsAppRescue(shop);
    } finally {
      setSubmittingRescueId(null);
    }
  };

  // Genuine Live Rescue Tracking (Poll real status from DB instead of fake simulation)
  useEffect(() => {
    if (!activeRescue?.breakdownId || activeRescue.status === "completed") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/breakdowns?id=${encodeURIComponent(activeRescue.breakdownId)}`);
        if (res.ok) {
          const json = await res.json();
          const b = json.breakdown;
          if (b && b.status) {
            setActiveRescue((prev) => {
              if (!prev) return null;
              const mechLat = b.mechanicLat ?? prev.shop.latitude;
              const mechLng = b.mechanicLng ?? prev.shop.longitude;
              const curDist = Math.round(distanceKm(prev.customerLat, prev.customerLng, mechLat, mechLng) * 10) / 10;
              const curEta = b.etaMinutes ?? Math.max(1, Math.round(curDist * 3.5));

              return {
                ...prev,
                status: b.status as any,
                mechanicLat: mechLat,
                mechanicLng: mechLng,
                distanceKm: curDist,
                etaMinutes: curEta,
              };
            });
          }
        }
      } catch {}
    }, 4500);

    return () => clearInterval(interval);
  }, [activeRescue?.breakdownId, activeRescue?.status]);

  // Filter mechanics within 7 km that match vehicle type
  const mechanicsWithin7km = registeredShops.filter((s) => {
    const isWithin7km = s.distanceKm <= 7.0;
    const matchVehicle = matchesVehicleType(s.vehicleTypes, vehicleType);
    return isWithin7km && matchVehicle;
  });

  return (
    <div className="min-h-screen w-full bg-[#F4FAFC] text-[#172033] pb-24 font-['DM_Sans',sans-serif] overflow-x-hidden">
      {/* 1. Header with Clean Branding & Hamburger Menu on Right */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D5DEE5] px-4 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-[#2F6B73] to-[#1E484E] flex items-center justify-center border border-white/20 shadow-xs">
              <svg className="w-5 h-5 text-white" viewBox="0 0 48 48" fill="none">
                <path d="M11 42L20 6H28L37 42" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="24" y1="10" x2="24" y2="17" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                <line x1="24" y1="23" x2="24" y2="30" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                <line x1="24" y1="36" x2="24" y2="41" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-lg font-black font-['Manrope'] tracking-tight text-[#172033]">
                  Sevai<span className="text-[#2F6B73]">Go</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#EAF4FF] text-[#2F6B73] border border-[#BFDBFE] text-[10px] font-bold uppercase tracking-wider">
                  Customer
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-medium">Roadside Breakdown Rescue</span>
            </div>
          </div>

          {/* Hamburger Menu Trigger on Right (Replaces old permanent Sign Out button) */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 rounded-xl border border-[#D5DEE5] bg-white hover:bg-slate-50 text-[#172033] shadow-xs transition-colors cursor-pointer flex items-center justify-center"
            title="Open Menu"
            aria-label="Open Navigation Menu"
            aria-expanded={menuOpen}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Hamburger Drawer & Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Slide-out Drawer */}
          <div className="relative z-10 w-full max-w-xs h-full bg-white border-l border-[#D5DEE5] shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#D5DEE5] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#EAF4FF] text-[#2F6B73] font-bold text-xs flex items-center justify-center border border-[#BFDBFE]">
                    <User size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#172033] block">
                      {user.phone ? `+91 ${user.phone}` : (user.name || "Customer")}
                    </span>
                    <span className="text-[10px] text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded border border-[#86EFAC] font-semibold">
                      Verified Customer
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Options */}
              <div className="space-y-1 text-sm font-semibold text-[#172033]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("dashboard");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-[#EAF4FF] text-[#2F6B73] font-bold border border-[#BFDBFE]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <LayoutDashboard size={18} className={activeTab === "dashboard" ? "text-[#2F6B73]" : "text-[#64748B]"} />
                  <span>Dashboard (Breakdown Rescue)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("bookings");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === "bookings"
                      ? "bg-[#EAF4FF] text-[#2F6B73] font-bold border border-[#BFDBFE]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <Clock size={18} className={activeTab === "bookings" ? "text-[#2F6B73]" : "text-[#64748B]"} />
                  <span>My Bookings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("profile");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors text-left cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-[#EAF4FF] text-[#2F6B73] font-bold border border-[#BFDBFE]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <User size={18} className={activeTab === "profile" ? "text-[#2F6B73]" : "text-[#64748B]"} />
                  <span>Profile & Vehicles</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHelpOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <HelpCircle size={18} className="text-[#64748B]" />
                  <span>Help & Support</span>
                </button>
              </div>
            </div>

            {/* Sign Out at the Bottom */}
            <div className="pt-4 border-t border-[#D5DEE5]">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-[#FEE2E2] hover:bg-red-100 text-[#991B1B] text-xs font-bold border border-[#FCA5A5] transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D5DEE5] shadow-xl p-5 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#172033]">Confirm Sign Out</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Are you sure you want to sign out from your SevaiGo Customer account?
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setMenuOpen(false);
                  onLogout();
                }}
                className="h-10 px-3 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Content Container */}
      <main className="max-w-2xl mx-auto px-3.5 sm:px-4 py-4 sm:py-5 space-y-5">
        {/* VIEW 1: MY BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-2xl border border-[#D5DEE5] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5DEE5]">
              <div className="flex items-center gap-2">
                <Clock className="text-[#2F6B73]" size={18} />
                <h2 className="text-base font-bold text-[#172033]">My Rescue Bookings</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="text-xs font-bold text-[#2F6B73] hover:underline"
              >
                Back to Breakdown Request
              </button>
            </div>

            {activeRescue ? (
              <div className="p-4 rounded-xl bg-[#EAF4FF] border border-[#BFDBFE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172033]">{activeRescue.shop.shopName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                    {activeRescue.status === "arrived" ? "Arrived" : "On the way"}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">Issue: {issue}</p>
                <p className="text-xs text-[#64748B]">ETA: ~{activeRescue.etaMinutes} mins ({activeRescue.distanceKm} km)</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className="mt-2 w-full h-10 rounded-xl bg-[#2F6B73] text-white text-xs font-bold"
                >
                  View Live Map Tracking
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#64748B] space-y-2">
                <Wrench className="mx-auto text-slate-400" size={28} />
                <p>No active rescue bookings currently underway.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 rounded-xl bg-[#2F6B73] text-white font-bold"
                >
                  Request Roadside Assistance
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-[#D5DEE5] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5DEE5]">
              <div className="flex items-center gap-2">
                <User className="text-[#2F6B73]" size={18} />
                <h2 className="text-base font-bold text-[#172033]">Rider Profile & Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="text-xs font-bold text-[#2F6B73] hover:underline"
              >
                Back to Dashboard
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex justify-between items-center">
                <span className="text-[#64748B]">Registered Mobile Number</span>
                <span className="font-bold text-[#172033] font-mono">
                  {user.phone ? `+91 ${user.phone}` : (user.email || "Registered")}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex justify-between items-center">
                <span className="text-[#64748B]">Account Type</span>
                <span className="font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#86EFAC]">
                  Verified Customer
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex justify-between items-center">
                <span className="text-[#64748B]">Preferred Vehicle</span>
                <span className="font-bold text-[#172033]">
                  {vehicleType === "2w" ? "2-Wheeler (Motorcycle)" : "4-Wheeler (Car)"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex justify-between items-center">
                <span className="text-[#64748B]">Emergency Helpline</span>
                <span className="font-bold text-[#2F6B73] font-mono">1800-SEVAIGO (24/7)</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: MAIN RESCUE DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            {/* Active Rescue Live Tracking View */}
            {activeRescue && (
              <div className="bg-white rounded-2xl border-2 border-[#3B82F6] shadow-sm p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#D5DEE5]">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-['Manrope'] text-[#172033] uppercase tracking-wide">
                          Live Mechanic Tracking
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-black uppercase">
                          {activeRescue.status === "arrived" ? "Arrived at Spot" : "En Route"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] font-medium mt-0.5">
                        {activeRescue.status === "arrived"
                          ? "மெக்கானிக் வந்துவிட்டார்! Mechanic has reached your breakdown location."
                          : "மெக்கானிக் புறப்பட்டுவிட்டார்! Live tracking your rescue mechanic."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveRescue(null)}
                    className="text-xs text-[#64748B] hover:text-red-600 font-bold px-2.5 py-1 rounded-lg border border-[#D5DEE5] hover:border-red-200 hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {/* Live ETA & Distance Card */}
                <div className="grid grid-cols-2 gap-3 bg-[#EAF4FF] p-3.5 rounded-xl border border-[#BFDBFE]">
                  <div className="flex items-center gap-2.5">
                    <Clock className="text-[#2F6B73] shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase">Estimated Arrival</div>
                      <div className="text-base font-black text-[#172033]">
                        {activeRescue.status === "arrived" ? "Arrived!" : `~${activeRescue.etaMinutes} mins`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 border-l border-[#BFDBFE] pl-3">
                    <Navigation className="text-[#2F6B73] shrink-0" size={18} />
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase">Live Distance</div>
                      <div className="text-base font-black text-[#172033]">
                        {activeRescue.status === "arrived" ? "0 km (At your spot)" : `${activeRescue.distanceKm} km`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Leaflet Map showing Route & Moving Mechanic */}
                <div className="h-64 sm:h-72 rounded-xl overflow-hidden border border-[#D5DEE5] shadow-inner relative">
                  <MechanicMap
                    location={{
                      latitude: activeRescue.customerLat,
                      longitude: activeRescue.customerLng,
                      label: activeRescue.customerAddress,
                      source: "gps",
                    }}
                    trackingMode={true}
                    customerLocation={{
                      latitude: activeRescue.customerLat,
                      longitude: activeRescue.customerLng,
                      label: activeRescue.customerAddress,
                    }}
                    mechanicLocation={{
                      latitude: activeRescue.mechanicLat,
                      longitude: activeRescue.mechanicLng,
                      label: activeRescue.shop.shopName,
                      shopName: activeRescue.shop.shopName,
                      etaMinutes: activeRescue.etaMinutes,
                    }}
                  />
                  <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#D5DEE5] text-xs font-bold text-[#172033] shadow-xs flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Route & GPS Movement</span>
                  </div>
                </div>

                {/* Mechanic Contact & Dispatch Card */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#172033]">{activeRescue.shop.shopName}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC]">
                        Verified Mechanic
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Owner: <span className="font-semibold text-slate-800">{activeRescue.shop.ownerName}</span> • Phone: <span className="font-semibold text-slate-800">{activeRescue.shop.phone}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Issue: <span className="font-medium text-slate-700">{issue}</span>
                      {selectedSpareParts.length > 0 && ` • Parts: ${selectedSpareParts.join(", ")}`}
                    </p>
                  </div>

                  {/* Reach Mechanic Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${activeRescue.shop.phone}`}
                      className="px-4 py-2.5 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Phone size={14} />
                      <span>Call Mechanic</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => triggerWhatsAppRescue(activeRescue.shop)}
                      className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Send size={14} />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1: Breakdown Details Form */}
            <div className="bg-white rounded-2xl border border-[#D5DEE5] shadow-xs p-4 sm:p-5 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D5DEE5]">
                <div>
                  <h1 className="text-base sm:text-lg font-black text-[#172033] font-['Manrope']">
                    Current Bike Breakdown Details
                  </h1>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Provide breakdown info to dispatch the nearest verified mechanic within 7 km
                  </p>
                </div>
                <span
                  className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-[#EAF4FF] text-[#2F6B73] border border-[#BFDBFE] text-xs font-bold tracking-wide shrink-0"
                  aria-label="Step 1 of 2: Breakdown Details"
                >
                  Step 1 of 2
                </span>
              </div>

              {/* Location Bar with Live GPS & Location Typing */}
              <div>
                <label className="text-xs font-extrabold text-[#172033] block mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#2F6B73]" />
                  <span>Current Bike Breakdown Location *</span>
                </label>
                
                {/* Responsive Location Box & Detect GPS Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <MapPin size={15} className="text-[#2F6B73] shrink-0" />
                      <span className="font-semibold text-[#172033] truncate">{locationLabel}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-mono shrink-0 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingGps}
                    className="h-11 px-4 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                    title="Detect current GPS location"
                  >
                    <LocateFixed size={15} className={detectingGps ? "animate-spin" : ""} />
                    <span>{detectingGps ? "Detecting..." : "Detect Location"}</span>
                  </button>
                </div>

                {/* GPS Notice / Error Banner if Permission Denied */}
                {locationError && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span className="leading-snug">{locationError}</span>
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-amber-950 text-[11px] shrink-0 cursor-pointer transition-colors"
                    >
                      Retry GPS
                    </button>
                  </div>
                )}

                {/* Autocomplete Search Input & Action Buttons (Mobile-Responsive to Prevent Overflow) */}
                <form onSubmit={handleSearchLocation} className="mt-2.5 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      placeholder="Type breakdown area (e.g. Gobichettipalayam, Erode, 638452)..."
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-xs text-[#172033] placeholder:text-slate-400 focus:outline-none focus:border-[#2F6B73]"
                    />
                    <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                    <button
                      type="submit"
                      disabled={isSearchingLocation || !locationSearchQuery.trim()}
                      className="h-11 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center"
                    >
                      {isSearchingLocation ? "Searching..." : "Set Location"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBreakdownMap(!showBreakdownMap)}
                      className="h-11 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#172033] border border-[#D5DEE5] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {showBreakdownMap ? "Hide Map" : "📍 Pick on Map"}
                    </button>
                  </div>
                </form>

                {/* Interactive Breakdown Map Picker Pin */}
                {showBreakdownMap && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-[#D5DEE5] shadow-inner relative">
                    <div className="h-60">
                      <MechanicMap
                        location={{ latitude, longitude, label: locationLabel, source: "manual" }}
                        pickerMode={true}
                        pickedLocation={{ latitude, longitude }}
                        onPickLocation={handlePickBreakdownSpot}
                      />
                    </div>
                    <div className="bg-[#172033] text-white text-[11px] font-semibold px-3 py-1.5 flex items-center justify-between">
                      <span>📍 Click or drag pin to your exact vehicle breakdown spot</span>
                      <span className="text-[#38BDF8] font-mono">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Type (2W / 4W) */}
              <div>
                <label className="text-xs font-extrabold text-[#172033] block mb-2">
                  Vehicle Type *
                </label>
                <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setVehicleType("2w")}
                    className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      vehicleType === "2w"
                        ? "bg-[#EAF4FF] border-[#3B82F6] text-[#172033] shadow-xs"
                        : "bg-white border-[#D5DEE5] text-[#172033] hover:border-slate-300"
                    }`}
                  >
                    <Bike size={22} strokeWidth={2.4} className={vehicleType === "2w" ? "text-[#2F6B73]" : "text-[#64748B]"} />
                    <span>2-Wheeler (Bike / Scooter)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleType("4w")}
                    className={`h-12 rounded-xl border-2 flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      vehicleType === "4w"
                        ? "bg-[#EAF4FF] border-[#3B82F6] text-[#172033] shadow-xs"
                        : "bg-white border-[#D5DEE5] text-[#172033] hover:border-slate-300"
                    }`}
                  >
                    <Car size={22} strokeWidth={2.4} className={vehicleType === "4w" ? "text-[#2F6B73]" : "text-[#64748B]"} />
                    <span>4-Wheeler (Car / Van)</span>
                  </button>
                </div>
              </div>

              {/* Breakdown Issue */}
              <div>
                <label className="text-xs font-extrabold text-[#172033] block mb-2">
                  Breakdown Issue *
                </label>
                <div className="grid grid-cols-1 min-[390px]:grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMMON_ISSUES.map((item) => {
                    const isSelected = issue === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIssue(item.id)}
                        className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#EAF4FF] border-[#3B82F6] shadow-xs"
                            : "bg-white border-[#D5DEE5] hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold text-[#172033] leading-snug">{item.label}</span>
                        <span className={`text-[11px] mt-1.5 font-bold ${isSelected ? "text-[#2F6B73]" : "text-[#64748B]"}`}>
                          {item.est}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Notes */}
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any landmark or details (e.g. Near bus stop, tyre puncture)"
                  className="mt-2.5 w-full h-11 px-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-xs text-[#172033] focus:outline-none focus:border-[#2F6B73]"
                />
              </div>

              {/* Attach Photo of Bike / Breakdown (Optional) */}
              <div>
                <label className="text-xs font-extrabold text-[#172033] block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-[#2F6B73]" />
                    <span>Attach Photo of Bike / Breakdown (Optional)</span>
                  </span>
                  <span className="text-[11px] text-[#64748B] font-normal">Helps mechanic bring right tools</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#D5DEE5] bg-slate-50">
                    <img
                      src={photoPreview}
                      alt="Breakdown attachment"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview("")}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                      title="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[#D5DEE5] hover:border-[#2F6B73] bg-[#F8FAFC] flex flex-col items-center justify-center gap-1 text-[#64748B] hover:text-[#2F6B73] transition-colors cursor-pointer"
                  >
                    <Upload size={20} />
                    <span className="text-xs font-bold">Tap to Take or Upload Breakdown Photo</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG under 8MB</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 2: Nearest Available Mechanics (Within 7 km) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#172033] font-['Manrope'] flex items-center gap-2">
                    <span>Nearest Available Mechanics</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-extrabold uppercase">
                      Within 7 km
                    </span>
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Strictly registered, verified mechanics only · No fake listings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadRegisteredMechanics(latitude, longitude)}
                  className="p-2 rounded-xl border border-[#D5DEE5] bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh nearby mechanics"
                >
                  <RefreshCw size={14} className={loadingShops ? "animate-spin" : ""} />
                </button>
              </div>

              {/* Compact Error Message with Retry */}
              {searchError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                  <span>{searchError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      shopsCacheRef.current = {};
                      loadRegisteredMechanics(latitude, longitude);
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 font-bold text-rose-950 text-[11px] shrink-0 cursor-pointer transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loadingShops && (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#D5DEE5] space-y-2">
                  <div className="w-6 h-6 border-2 border-[#2F6B73] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#64748B] font-semibold">Scanning 7 km radius for registered mechanics...</p>
                </div>
              )}

              {/* List of Mechanics within 7 km */}
              {!loadingShops && mechanicsWithin7km.length > 0 && (
                <div className="space-y-4">
                  {mechanicsWithin7km.map((shop) => {
                    const isRequested = requestedStatus === shop.id;
                    const isSubmittingThis = submittingRescueId === shop.id;

                    return (
                      <div
                        key={shop.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D5DEE5] shadow-xs space-y-4"
                      >
                        {/* Header: Shop Name & Distance */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-extrabold text-[#172033]">{shop.shopName}</h3>
                              <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-bold border border-[#86EFAC] flex items-center gap-0.5">
                                <ShieldCheck size={11} /> Verified
                              </span>
                            </div>
                            <p className="text-xs text-[#64748B] mt-0.5 flex items-center gap-1">
                              <MapPin size={12} className="text-[#2F6B73] shrink-0" />
                              <span className="truncate">{shop.address}</span>
                            </p>
                          </div>

                          {/* Distance Badge */}
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-[#2F6B73] block">{shop.distanceKm} km</span>
                            <span className="text-[10px] text-[#64748B] font-semibold">~{shop.etaMinutes} mins arrival</span>
                          </div>
                        </div>

                        {/* Spare Parts Sale Option */}
                        <div className="p-3.5 rounded-xl bg-[#EAF4FF]/40 border border-[#BFDBFE]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-extrabold text-[#172033] flex items-center gap-1.5">
                              <ShoppingBag size={13} className="text-[#2F6B73]" />
                              <span>Shop Spare Parts for Sale (உதிரி பாகங்கள்):</span>
                            </span>
                            {selectedSpareParts.length > 0 && (
                              <span className="text-[10px] text-white font-bold bg-[#2F6B73] px-2 py-0.5 rounded-full">
                                {selectedSpareParts.length} selected
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {SHOP_SPARE_PARTS.map((sp) => {
                              const isChosen = selectedSpareParts.includes(sp.name);
                              return (
                                <button
                                  key={sp.name}
                                  type="button"
                                  onClick={() => toggleSparePart(sp.name)}
                                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                    isChosen
                                      ? "bg-[#2F6B73] text-white border-[#2F6B73] shadow-xs"
                                      : "bg-white text-[#172033] border-[#D5DEE5] hover:border-slate-300"
                                  }`}
                                >
                                  <span className="text-[10px] font-bold leading-tight flex items-start gap-1">
                                    {isChosen && <CheckCircle2 size={11} className="shrink-0 mt-0.5" />}
                                    <span>{sp.name}</span>
                                  </span>
                                  <span className={`text-[10px] font-extrabold mt-1 ${isChosen ? "text-blue-100" : "text-[#2F6B73]"}`}>
                                    ₹{sp.price}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Responsive Action Buttons: Call, WhatsApp, Dispatch Request */}
                        <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 pt-1">
                          {/* 1. Direct Call */}
                          <a
                            href={`tel:${shop.phone}`}
                            className="flex-1 h-10 px-3 rounded-xl bg-white hover:bg-slate-50 text-[#172033] border border-[#D5DEE5] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center cursor-pointer shadow-xs"
                          >
                            <Phone size={14} className="text-[#2F6B73]" />
                            <span>Call</span>
                          </a>

                          {/* 2. WhatsApp Rescue */}
                          <button
                            type="button"
                            onClick={() => triggerWhatsAppRescue(shop)}
                            className="flex-1 h-10 px-3 rounded-xl bg-[#DCFCE7] hover:bg-emerald-100 text-[#166534] border border-[#86EFAC] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center shadow-xs"
                          >
                            <Send size={14} className="text-emerald-700" />
                            <span>WhatsApp</span>
                          </button>

                          {/* 3. Dispatch Rescue Request */}
                          <button
                            type="button"
                            disabled={isSubmittingThis || isRequested}
                            onClick={() => submitRescueRequest(shop)}
                            className={`min-[480px]:flex-[1.4] h-10 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              isRequested
                                ? "bg-emerald-600 text-white"
                                : "bg-[#2F6B73] hover:bg-[#24545A] text-white"
                            }`}
                          >
                            {isSubmittingThis ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isRequested ? (
                              <>
                                <CheckCircle2 size={14} />
                                <span>Requested!</span>
                              </>
                            ) : (
                              <>
                                <Wrench size={14} />
                                <span>Request Rescue</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No Mechanics within 7 km Informational State */}
              {!loadingShops && mechanicsWithin7km.length === 0 && (
                <div className="p-6 rounded-2xl bg-[#EAF4FF] border border-[#BFDBFE] text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white text-[#2F6B73] flex items-center justify-center mx-auto border border-[#BFDBFE]">
                    <Store size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#172033]">
                      No partner workshops within 7 km
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto leading-relaxed">
                      We strictly show genuine, verified mechanics. Currently, no registered workshop is within 7 km of <span className="font-semibold text-slate-800">{locationLabel}</span> ({latitude.toFixed(4)}, {longitude.toFixed(4)}).
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const annaLat = 13.0827;
                        const annaLng = 80.2707;
                        setLatitude(annaLat);
                        setLongitude(annaLng);
                        setLocationLabel("Anna Salai, Chennai");
                        loadRegisteredMechanics(annaLat, annaLng);
                        say("Switched to Anna Salai (Ajmal Workshop area)");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#BFDBFE] text-xs font-bold text-[#2F6B73] cursor-pointer shadow-xs transition-colors"
                    >
                      View Anna Salai, Chennai (Ajmal Workshop)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const chromeLat = 12.9516;
                        const chromeLng = 80.1462;
                        setLatitude(chromeLat);
                        setLongitude(chromeLng);
                        setLocationLabel("Chromepet, Chennai");
                        loadRegisteredMechanics(chromeLat, chromeLng);
                        say("Switched to Chromepet (Speed Wings Auto Care area)");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#BFDBFE] text-xs font-bold text-[#2F6B73] cursor-pointer shadow-xs transition-colors"
                    >
                      View Chromepet, Chennai (Speed Wings)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Help Modal */}
      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        onEmergencyRescue={() => {
          setHelpOpen(false);
          setActiveTab("dashboard");
        }}
      />
    </div>
  );
}
