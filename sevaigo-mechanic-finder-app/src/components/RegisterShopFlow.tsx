"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bike, Camera, CarFront, Check, CheckCircle2, Clock3,
  Compass, Info, LocateFixed, LogOut, MapPin, Navigation, Phone, Search, ShieldAlert,
  ShieldCheck, Sparkles, Store, Truck, Upload, UserRound, Wrench, X, AlertCircle, Edit3
} from "lucide-react";
import MechanicMap, { type MapLocation } from "@/components/MechanicMap";
import type { PublicUser } from "@/lib/auth";
import { DEMO_LOCATION } from "@/lib/mechanic-shared";
import { supabase } from "@/lib/supabaseClient";

export type OwnerShopData = {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  shopPhone?: string | null;
  address: string;
  city?: string | null;
  pincode?: string | null;
  latitude: number;
  longitude: number;
  vehicleTypes: string[];
  specializations: string[];
  spareParts?: string[];
  workingDays?: string[] | null;
  openTime: string;
  closeTime: string;
  photos: string[];
  approvalStatus: string;
  availabilityStatus: string;
  priceMin: number;
  priceMax: number;
  yearsExperience: number;
  isVerified: boolean;
  isOnline?: boolean;
};

const VEHICLE_OPTIONS = [
  { value: "2w", label: "2-Wheeler (Bikes & Scooters)", icon: Bike },
  { value: "4w", label: "4-Wheeler (Cars & SUVs)", icon: CarFront },
  { value: "truck", label: "Commercial Trucks", icon: Truck },
  { value: "bus", label: "Buses & Heavy Transport", icon: Truck },
];

const SPECIALTY_OPTIONS = [
  "Engine repair",
  "Electrical & Wiring",
  "Tyre & puncture",
  "Battery jumpstart / swap",
  "Body work & Denting",
  "AC repair & Coolant",
  "General service & Oil change",
  "Brake & Clutch service",
  "Towing & Roadside recovery",
];

export const SPARE_PART_OPTIONS = [
  "Tubes (Front/Rear)",
  "Tubeless Patches",
  "Brake Pads & Shoes",
  "Engine Oil (Motul/Castrol)",
  "Battery (Exide/Amaron)",
  "Spark Plugs",
  "Clutch Cable",
  "Chain Lube",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RegisterShopFlow({
  initialUser,
  onBack,
}: {
  initialUser: PublicUser | null;
  onBack?: () => void;
}) {
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [existingShop, setExistingShop] = useState<OwnerShopData | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);

  // Form State
  const [ownerName, setOwnerName] = useState(initialUser?.name || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState(initialUser?.phone || "");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [shopPhotoPreview, setShopPhotoPreview] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [pincode, setPincode] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(["2w", "4w"]);
  const [specializations, setSpecializations] = useState<string[]>(["Engine repair", "General service & Oil change", "Tyre & puncture"]);
  const [workingDays, setWorkingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [priceMin, setPriceMin] = useState("250");
  const [priceMax, setPriceMax] = useState("2500");
  const [yearsExperience, setYearsExperience] = useState("6");
  const [workshopPhotoUrl, setWorkshopPhotoUrl] = useState("");
  const [businessDoc, setBusinessDoc] = useState("");
  const [spareParts, setSpareParts] = useState<string[]>(["Tubes (Front/Rear)", "Spark Plugs", "Engine Oil (Motul/Castrol)", "Brake Pads & Shoes"]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<any | null>(null);
  const [sharingLocationId, setSharingLocationId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const prevIncomingCountRef = useRef<number>(0);

  // Map Picker State
  const [pickedCoords, setPickedCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: DEMO_LOCATION.latitude,
    longitude: DEMO_LOCATION.longitude,
  });
  const [geoLocating, setGeoLocating] = useState(false);

  // Submission & Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [syncingMapLocation, setSyncingMapLocation] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const editAddressDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const regAddressDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Dashboard Edit State
  const [editingShop, setEditingShop] = useState(false);
  const [editDraft, setEditDraft] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    shopPhone: "",
    address: "",
    city: "",
    pincode: "",
    openTime: "08:00",
    closeTime: "21:00",
    priceMin: "300",
    priceMax: "2500",
    availabilityStatus: "free",
    specializations: [] as string[],
    workingDays: [] as string[],
    latitude: DEMO_LOCATION.latitude,
    longitude: DEMO_LOCATION.longitude,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Check if current user already owns a shop from Supabase
  const fetchOwnerShop = useCallback(async () => {
    try {
      const currentPhone = user?.phone || phone;
      if (currentPhone) {
        const res = await fetch(`/api/register-shop?phone=${encodeURIComponent(currentPhone)}`);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.success && json.shop) {
            const matched = json.shop;
            const servicesList = Array.isArray(matched.services) ? matched.services : [];
            const shopCity = matched.city || "";
            const shopPincode = matched.pincode || "";
            const rawShopLat = Number(matched.lat ?? matched.latitude);
            const rawShopLng = Number(matched.lng ?? matched.longitude);
            const shopLat = Number.isFinite(rawShopLat) ? rawShopLat : 13.0827;
            const shopLng = Number.isFinite(rawShopLng) ? rawShopLng : 80.2707;

            setExistingShop({
              id: matched.id,
              shopName: matched.shop_name || "Workshop",
              ownerName: matched.owner_name || "Mechanic",
              phone: matched.phone || "",
              shopPhone: matched.phone || "",
              address: matched.address || "",
              city: shopCity,
              pincode: shopPincode,
              latitude: shopLat,
              longitude: shopLng,
              vehicleTypes: ["2w", "4w"],
              specializations: servicesList,
              openTime: "08:00",
              closeTime: "21:00",
              photos: ["/images/workshop-1.jpg"],
              approvalStatus: "approved",
              availabilityStatus: "available",
              priceMin: 300,
              priceMax: 2500,
              yearsExperience: 5,
              isVerified: matched.verified ?? true,
            });
            setEditDraft({
              shopName: matched.shop_name || "",
              ownerName: matched.owner_name || "",
              phone: matched.phone || "",
              shopPhone: matched.phone || "",
              address: matched.address || "",
              city: shopCity,
              pincode: shopPincode,
              openTime: "08:00",
              closeTime: "21:00",
              priceMin: "300",
              priceMax: "2500",
              availabilityStatus: "free",
              specializations: servicesList,
              workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              latitude: shopLat,
              longitude: shopLng,
            });
            setLoadingShop(false);
            return;
          }
        }
      }

      const res = await fetch("/api/owner");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.shop) {
          const s = data.shop;
          const rawSLat = Number(s.latitude);
          const rawSLng = Number(s.longitude);
          const sLat = Number.isFinite(rawSLat) ? rawSLat : 13.0827;
          const sLng = Number.isFinite(rawSLng) ? rawSLng : 80.2707;
          setExistingShop({
            ...s,
            latitude: sLat,
            longitude: sLng,
          });
          setEditDraft({
            shopName: s.shopName || "",
            ownerName: s.ownerName || "",
            phone: s.phone || "",
            shopPhone: s.shopPhone || s.phone || "",
            address: s.address || "",
            city: s.city || "",
            pincode: s.pincode || "",
            openTime: s.openTime || "08:00",
            closeTime: s.closeTime || "21:00",
            priceMin: String(s.priceMin || "300"),
            priceMax: String(s.priceMax || "2500"),
            availabilityStatus: s.availabilityStatus || "free",
            specializations: s.specializations || [],
            workingDays: s.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            latitude: sLat,
            longitude: sLng,
          });
        }
      }
    } catch {
      // User not logged in or no shop
    } finally {
      setLoadingShop(false);
    }
  }, [user, phone]);

  useEffect(() => {
    fetchOwnerShop();
  }, [fetchOwnerShop]);

  // Handle GPS location detection
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickedCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        setErrorMessage(
          err.code === 1
            ? "Location permission denied. Please click on the map directly to place your shop marker."
            : "Could not detect your current location. Please pick your location on the map."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Play audio alert chime when new customer breakdown request arrives
  function playAlertChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext muted/unsupported
    }
  }

  // Auto-search locality & landmark to pinpoint shop on map
  async function handleSearchLocation(queryOverride?: string) {
    const q = (queryOverride ?? locationQuery).trim();
    if (!q) return;
    setIsSearchingLocation(true);
    setErrorMessage("");
    try {
      const searchQuery = q.toLowerCase().includes("tamil nadu") || q.toLowerCase().includes("india")
        ? q
        : `${q}, Tamil Nadu, India`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "User-Agent": "SevaiGo-Partner" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          const newLat = Number(Number(first.lat).toFixed(6));
          const newLng = Number(Number(first.lon).toFixed(6));
          setPickedCoords({ latitude: newLat, longitude: newLng });
          if (!address) {
            setAddress(first.display_name?.split(",").slice(0, 3).join(",") || q);
          }
          const parts = first.display_name?.split(",") || [];
          if (parts.length > 2 && !city) {
            setCity(parts[parts.length - 3]?.trim() || "Chennai");
          }
          setSuccessMessage(`📍 Map updated to: ${first.display_name?.split(",").slice(0, 2).join(",")}`);
        } else {
          setErrorMessage(`Could not find "${q}" on the map. Please click on the map directly or try another landmark.`);
        }
      }
    } catch {
      setErrorMessage("Could not search location. Please click directly on the map.");
    } finally {
      setIsSearchingLocation(false);
    }
  }

  // Comprehensive Address Geocoding with Fallback Cascade
  const geocodeAddressToCoords = async (
    street: string,
    cityStr: string,
    pinStr: string
  ): Promise<{ lat: number; lng: number; label: string } | null> => {
    const cleanPin = (pinStr || "").replace(/\D/g, "");
    const cleanCity = cityStr?.trim() || "";
    const cleanStreet = street?.trim() || "";

    const queries: string[] = [];
    if (cleanStreet && cleanCity && cleanPin) {
      queries.push(`${cleanStreet}, ${cleanCity}, ${cleanPin}, Tamil Nadu, India`);
      queries.push(`${cleanStreet}, ${cleanCity}, India`);
    }
    if (cleanStreet) {
      const parts = cleanStreet.split(",").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (cleanCity) queries.push(`${part}, ${cleanCity}, Tamil Nadu, India`);
        queries.push(`${part}, Tamil Nadu, India`);
      }
    }
    if (cleanPin && cleanPin.length === 6) {
      queries.push(`${cleanPin}, India`);
      queries.push(`${cleanPin}, Tamil Nadu, India`);
    }
    if (cleanCity) {
      queries.push(`${cleanCity}, Tamil Nadu, India`);
    }

    for (const q of queries) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
          { headers: { "User-Agent": "SevaiGo-App" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const lat = Number(Number(item.lat).toFixed(6));
            const lng = Number(Number(item.lon).toFixed(6));
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              return { lat, lng, label: item.display_name || q };
            }
          }
        }
      } catch {}
    }
    return null;
  };

  // Reverse Geocoding when Pin is clicked or dragged on Map
  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`,
        { headers: { "User-Agent": "SevaiGo-App" } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.street || "";
        const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || "";
        const town = addr.city || addr.town || addr.county || addr.district || "";
        const postcode = addr.postcode || "";

        const fullStreet = [road, suburb].filter(Boolean).join(", ");
        return {
          street: fullStreet || data.display_name?.split(",").slice(0, 2).join(", ") || "",
          city: town || "",
          pincode: postcode || "",
        };
      }
    } catch {}
    return null;
  };

  const handleSyncEditAddressToMap = async (customStreet?: string, customCity?: string, customPin?: string) => {
    const st = customStreet ?? editDraft.address;
    const ct = customCity ?? editDraft.city;
    const pin = customPin ?? editDraft.pincode;
    if (!st && !ct && !pin) return;
    setSyncingMapLocation(true);
    setSyncSuccessMsg("");
    const res = await geocodeAddressToCoords(st, ct, pin);
    if (res) {
      setEditDraft((prev) => ({
        ...prev,
        latitude: res.lat,
        longitude: res.lng,
      }));
      setSyncSuccessMsg(`📍 Map pin moved to: ${res.label.split(",").slice(0, 2).join(",")}`);
    } else {
      setSyncSuccessMsg(`Could not find "${st || ct}". Try selecting nearby town.`);
    }
    setSyncingMapLocation(false);
  };

  const handleEditAddressFieldChange = (field: "address" | "city" | "pincode", val: string) => {
    const updated = { ...editDraft, [field]: val };
    setEditDraft(updated);
    if (editAddressDebounceRef.current) clearTimeout(editAddressDebounceRef.current);
    editAddressDebounceRef.current = setTimeout(() => {
      handleSyncEditAddressToMap(updated.address, updated.city, updated.pincode);
    }, 700);
  };

  const handlePickEditLocation = async (coords: { latitude: number; longitude: number }) => {
    setEditDraft((prev) => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
    const rev = await reverseGeocodeCoords(coords.latitude, coords.longitude);
    if (rev) {
      setEditDraft((prev) => ({
        ...prev,
        address: rev.street || prev.address,
        city: rev.city || prev.city,
        pincode: rev.pincode || prev.pincode,
      }));
      setSyncSuccessMsg(`📍 Address updated from map: ${rev.street || rev.city}`);
    }
  };

  const handleSyncRegisterAddressToMap = async (customStreet?: string, customCity?: string, customPin?: string) => {
    const st = customStreet ?? address;
    const ct = customCity ?? city;
    const pin = customPin ?? pincode;
    if (!st && !ct && !pin) return;
    setSyncingMapLocation(true);
    setSyncSuccessMsg("");
    const res = await geocodeAddressToCoords(st, ct, pin);
    if (res) {
      setPickedCoords({ latitude: res.lat, longitude: res.lng });
      setSyncSuccessMsg(`📍 Map pin moved to: ${res.label.split(",").slice(0, 2).join(",")}`);
    }
    setSyncingMapLocation(false);
  };

  const handleRegAddressFieldChange = (field: "address" | "city" | "pincode", val: string) => {
    let nextAddr = address;
    let nextCity = city;
    let nextPin = pincode;
    if (field === "address") { setAddress(val); nextAddr = val; }
    if (field === "city") { setCity(val); nextCity = val; }
    if (field === "pincode") { setPincode(val); nextPin = val; }

    if (regAddressDebounceRef.current) clearTimeout(regAddressDebounceRef.current);
    regAddressDebounceRef.current = setTimeout(() => {
      handleSyncRegisterAddressToMap(nextAddr, nextCity, nextPin);
    }, 700);
  };

  const handlePickRegisterLocation = async (coords: { latitude: number; longitude: number }) => {
    setPickedCoords(coords);
    const rev = await reverseGeocodeCoords(coords.latitude, coords.longitude);
    if (rev) {
      if (rev.street) setAddress(rev.street);
      if (rev.city) setCity(rev.city);
      if (rev.pincode) setPincode(rev.pincode);
      setSyncSuccessMsg(`📍 Address updated from map: ${rev.street || rev.city}`);
    }
  };

  // Handle Shop Front Photo Upload
  function handleShopPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Shop photo is too large (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setShopPhotoPreview(dataUrl);
      setWorkshopPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function toggleVehicleType(type: string) {
    setVehicleTypes((prev) =>
      prev.includes(type) ? (prev.length > 1 ? prev.filter((t) => t !== type) : prev) : [...prev, type]
    );
  }

  function toggleSpecialty(spec: string) {
    setSpecializations((prev) =>
      prev.includes(spec) ? (prev.length > 1 ? prev.filter((s) => s !== spec) : prev) : [...prev, spec]
    );
  }

  function toggleSparePart(part: string) {
    setSpareParts((prev) =>
      prev.includes(part) ? (prev.length > 1 ? prev.filter((p) => p !== part) : prev) : [...prev, part]
    );
  }

  function toggleWorkingDay(day: string) {
    setWorkingDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
    );
  }

  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Phone validation (10 digits)
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number for communication.");
      return;
    }

    if (!user && (!password || password.length < 6)) {
      setErrorMessage("Please set a password with at least 6 characters so you can sign in to your dashboard.");
      return;
    }

    if (shopName.trim().length < 3) {
      setErrorMessage("Shop name must be at least 3 characters long.");
      return;
    }

    if (address.trim().length < 8) {
      setErrorMessage("Please enter the complete shop address (street, area, landmarks).");
      return;
    }

    setSubmitting(true);

    try {
      const fullAddress = address.trim() + (city ? `, ${city}` : "") + (pincode ? ` - ${pincode}` : "");
      const servicesList = Array.from(new Set([...vehicleTypes, ...specializations]));

      const payload = {
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || phone.trim(),
        additionalPhone: additionalPhone.trim() || shopPhone.trim() || undefined,
        email: email.trim() || undefined,
        password: password || undefined,
        shopName: shopName.trim(),
        shopPhone: shopPhone.trim() || additionalPhone.trim() || phone.trim(),
        address: address.trim(),
        city: city.trim() || "Chennai",
        pincode: pincode.trim(),
        latitude: pickedCoords.latitude,
        longitude: pickedCoords.longitude,
        vehicleTypes,
        specializations,
        workingDays,
        openTime,
        closeTime,
        priceMin: Number(priceMin) || 300,
        priceMax: Number(priceMax) || 2500,
        yearsExperience: Number(yearsExperience) || 5,
        photos: (shopPhotoPreview.trim() || workshopPhotoUrl.trim()) ? [shopPhotoPreview.trim() || workshopPhotoUrl.trim()] : ["/images/workshop-1.jpg"],
        spareParts,
        businessDoc: businessDoc.trim() || undefined,
      };

      let registrationSuccess = false;
      let returnedShop: any = null;
      let failureErrorMsg = "";

      // 1. Primary: Server-side registration call to /api/register-shop
      try {
        const res = await fetch("/api/register-shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
          registrationSuccess = true;
          returnedShop = data.shop;
        } else if (data?.error) {
          failureErrorMsg = data.error;
        }
      } catch (primaryErr: any) {
        console.warn("Primary register-shop endpoint warning, trying fallback:", primaryErr);
      }

      // 2. Secondary Fallback: /api/mechanics
      if (!registrationSuccess) {
        try {
          const resFallback = await fetch("/api/mechanics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const fbData = await resFallback.json().catch(() => null);
          if (resFallback.ok && (fbData?.shop || fbData?.mechanic || fbData?.success)) {
            registrationSuccess = true;
            returnedShop = fbData.shop || fbData.mechanic;
          } else if (fbData?.error) {
            failureErrorMsg = fbData.error;
          }
        } catch (fbErr: any) {
          console.warn("Fallback mechanics endpoint warning:", fbErr);
        }
      }

      if (!registrationSuccess) {
        const cleanMsg = failureErrorMsg.replace(/^(TypeError:\s*|Error:\s*)/i, "");
        if (
          !cleanMsg ||
          cleanMsg.includes("fetch failed") ||
          cleanMsg.includes("Failed to fetch") ||
          cleanMsg.includes("NetworkError")
        ) {
          throw new Error("Unable to reach the registration server. Please check your internet connection and try again.");
        }
        throw new Error(cleanMsg);
      }

      const s = returnedShop || {};
      const returnedServices = Array.isArray(s.services)
        ? s.services
        : Array.isArray(s.specializations)
        ? s.specializations
        : servicesList;

      setExistingShop({
        id: s.id || `shop-${Date.now()}`,
        shopName: s.shop_name || s.shopName || shopName.trim(),
        ownerName: s.owner_name || s.ownerName || ownerName.trim(),
        phone: s.phone || (shopPhone.trim() || phone.trim()),
        shopPhone: s.phone || (shopPhone.trim() || phone.trim()),
        address: s.address || fullAddress,
        city: city.trim() || "Chennai",
        latitude: s.lat || s.latitude || pickedCoords.latitude,
        longitude: s.lng || s.longitude || pickedCoords.longitude,
        vehicleTypes,
        specializations: returnedServices,
        openTime,
        closeTime,
        photos: workshopPhotoUrl.trim() ? [workshopPhotoUrl.trim()] : ["/images/workshop-1.jpg"],
        approvalStatus: "approved",
        availabilityStatus: "available",
        priceMin: Number(priceMin) || 300,
        priceMax: Number(priceMax) || 2500,
        yearsExperience: Number(yearsExperience) || 5,
        isVerified: true,
      });

      setSuccessMessage("Workshop registered successfully! Your garage has been saved to the database.");

      // Refresh current user and owner shop
      try {
        const userRes = await fetch("/api/auth");
        if (userRes.ok) {
          const udata = await userRes.json().catch(() => null);
          if (udata?.user) setUser(udata.user);
        }
      } catch {}

      await fetchOwnerShop();
    } catch (err: any) {
      console.error("Workshop registration error:", err);
      const raw = String(err?.message || err || "");
      if (
        raw.includes("fetch failed") ||
        raw.includes("Failed to fetch") ||
        raw.includes("NetworkError") ||
        raw.includes("TypeError")
      ) {
        setErrorMessage("Network error: Could not connect to the registration server. Please check your connection and tap Complete Registration again.");
      } else {
        setErrorMessage(raw.replace(/^(TypeError:\s*|Error:\s*)/i, ""));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch incoming live rescue requests for this workshop (every 3 seconds for instant reach)
  const fetchIncomingRequests = useCallback(async () => {
    if (!existingShop) return;
    try {
      const shopParam = existingShop.id ? `&shopId=${encodeURIComponent(existingShop.id)}` : "";
      const phoneParam = existingShop.phone || phone ? `&phone=${encodeURIComponent(existingShop.phone || phone)}` : "";
      const res = await fetch(`/api/breakdowns?mode=incoming${shopParam}${phoneParam}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.breakdowns || [];
        if (list.length > prevIncomingCountRef.current && list.length > 0) {
          playAlertChime();
          const newest = list[0];
          if (newest && newest.status === "pending") {
            setActiveEmergencyAlert(newest);
          }
        }
        prevIncomingCountRef.current = list.length;
        setIncomingRequests(list);
      }
    } catch {
      // ignore
    }
  }, [existingShop, phone]);

  // Zero-latency instant alert listener via BroadcastChannel and storage events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("sevaigo_breakdown_alerts");
      bc.onmessage = (event) => {
        const data = event.data;
        if (data && (data.type === "INCOMING_BREAKDOWN" || data.type === "NEW_BREAKDOWN_ALERT")) {
          playAlertChime();
          setActiveEmergencyAlert(data);
          fetchIncomingRequests();
        }
      };
    } catch {}

    const handleStorageAlert = (e: StorageEvent) => {
      if (e.key === "sevaigo_incoming_alert" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          playAlertChime();
          setActiveEmergencyAlert(parsed);
          fetchIncomingRequests();
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageAlert);

    return () => {
      try {
        bc?.close();
      } catch {}
      window.removeEventListener("storage", handleStorageAlert);
    };
  }, [fetchIncomingRequests]);

  useEffect(() => {
    if (existingShop) {
      fetchIncomingRequests();
      const interval = setInterval(fetchIncomingRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [existingShop, fetchIncomingRequests]);

  async function handleUpdateRequestStatus(id: string, status: string) {
    try {
      if (["completed", "declined", "cancelled"].includes(status)) {
        if (sharingLocationId === id) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setSharingLocationId(null);
        }
      }
      const res = await fetch("/api/breakdowns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        await fetchIncomingRequests();
        setSuccessMessage(`Rescue request status updated to: ${status}.`);
      }
    } catch {
      setErrorMessage("Could not update request status.");
    }
  }

  const toggleShareLocation = useCallback((reqId: string) => {
    if (sharingLocationId === reqId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocationId(null);
      setSuccessMessage("Live GPS location sharing stopped.");
      return;
    }
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your device.");
      return;
    }
    setSharingLocationId(reqId);
    setSuccessMessage("Sharing live GPS location with customer...");
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        await fetch("/api/breakdowns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reqId, mechanicLat: lat, mechanicLng: lng }),
        }).catch(() => {});
      },
      (err) => {
        console.error("GPS Watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [sharingLocationId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Toggle Available / Busy / Offline availability
  async function handleToggleAvailability(newStatus: "available" | "busy" | "offline") {
    if (!existingShop) return;
    try {
      const res = await fetch("/api/owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityStatus: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setExistingShop(data.shop);
        setEditDraft((prev) => ({ ...prev, availabilityStatus: newStatus }));
        setSuccessMessage(`Availability updated to ${newStatus}.`);
      }
    } catch {
      setErrorMessage("Could not update availability.");
    }
  }

  // Save Dashboard Updates via API
  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (existingShop?.id || editDraft.phone || editDraft.shopPhone) {
        await fetch("/api/register-shop", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingShop?.id,
            shopName: editDraft.shopName,
            ownerName: editDraft.ownerName,
            phone: editDraft.phone,
            shopPhone: editDraft.shopPhone || editDraft.phone,
            address: editDraft.address,
            latitude: editDraft.latitude,
            longitude: editDraft.longitude,
            services: Array.from(new Set([...vehicleTypes, ...editDraft.specializations])),
          }),
        }).catch((err) => console.warn("Supabase PATCH warning:", err));
      }

      const res = await fetch("/api/owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: editDraft.shopName,
          ownerName: editDraft.ownerName,
          phone: editDraft.phone,
          shopPhone: editDraft.shopPhone,
          address: editDraft.address,
          city: editDraft.city,
          pincode: editDraft.pincode,
          openTime: editDraft.openTime,
          closeTime: editDraft.closeTime,
          priceMin: Number(editDraft.priceMin),
          priceMax: Number(editDraft.priceMax),
          availabilityStatus: editDraft.availabilityStatus,
          specializations: editDraft.specializations,
          workingDays: editDraft.workingDays,
          latitude: editDraft.latitude,
          longitude: editDraft.longitude,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.shop) setExistingShop(data.shop);
      setEditingShop(false);
      setSuccessMessage("Workshop information updated successfully!");
    } catch (err: any) {
      console.error("Workshop update error:", err);
      setErrorMessage(err?.message || "Could not update workshop details.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)" }}>
      {/* Sudden Reach: Emergency Breakdown Alert Modal */}
      {activeEmergencyAlert && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(6px)",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "480px",
            borderRadius: "24px",
            backgroundColor: "#FFFFFF",
            border: "3px solid #dc2626",
            padding: "24px",
            boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.35)",
            color: "#0F172A",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}>
            {/* Alert Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "14px", borderBottom: "1px solid #fee2e2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#dc2626", display: "inline-block" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", color: "#dc2626", fontFamily: "'Manrope', sans-serif" }}>
                  🚨 INCOMING BREAKDOWN CALL / REQUEST!
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveEmergencyAlert(null)}
                style={{ background: "none", border: 0, cursor: "pointer", color: "#94a3b8", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Alert Details Card */}
            <div style={{ margin: "16px 0", padding: "16px", borderRadius: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontWeight: "700" }}>Customer Name:</span>
                <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{activeEmergencyAlert.userName || "Rider in Need"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontWeight: "700" }}>Phone Number:</span>
                <a href={`tel:${activeEmergencyAlert.userPhone}`} style={{ fontSize: "0.95rem", fontWeight: "800", color: "#2563eb", textDecoration: "underline", fontFamily: "monospace" }}>
                  {activeEmergencyAlert.userPhone}
                </a>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontWeight: "700" }}>Vehicle Type:</span>
                <span style={{ fontWeight: "800", color: "#0f172a" }}>{activeEmergencyAlert.vehicleType?.toUpperCase() || "2W"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontWeight: "700" }}>Breakdown Issue:</span>
                <span style={{ fontWeight: "800", color: "#b91c1c", backgroundColor: "#fee2e2", padding: "3px 8px", borderRadius: "6px" }}>
                  {activeEmergencyAlert.issue}
                </span>
              </div>
              {activeEmergencyAlert.address && (
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", display: "block", marginBottom: "2px" }}>Breakdown Location:</span>
                  <span style={{ color: "#1e293b", fontWeight: "600" }}>{activeEmergencyAlert.address}</span>
                </div>
              )}
              {activeEmergencyAlert.spareParts && activeEmergencyAlert.spareParts.length > 0 && (
                <div>
                  <span style={{ color: "#64748b", fontWeight: "700", display: "block", marginBottom: "4px" }}>Requested Spare Parts:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {activeEmergencyAlert.spareParts.map((sp: string) => (
                      <span key={sp} style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fff", border: "1px solid #fecaca", color: "#dc2626", fontWeight: "700" }}>
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeEmergencyAlert.photoUrl && (
                <div style={{ marginTop: "4px" }}>
                  <span style={{ color: "#64748b", fontWeight: "700", display: "block", marginBottom: "4px" }}>Breakdown Photo:</span>
                  <img src={activeEmergencyAlert.photoUrl} alt="Breakdown Attachment" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "10px", border: "1px solid #fecaca" }} />
                </div>
              )}
            </div>

            {/* Emergency Action Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <a
                href={`tel:${activeEmergencyAlert.userPhone}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  textDecoration: "none",
                  textAlign: "center",
                  boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                }}
              >
                <Phone size={16} /> <span>Call Customer</span>
              </a>
              <a
                href={`https://wa.me/91${(activeEmergencyAlert.userPhone || "").replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                  `Hello ${activeEmergencyAlert.userName || "Customer"}, I am from ${existingShop?.shopName || "SevaiGo Partner Garage"}. I received your emergency breakdown request (${activeEmergencyAlert.issue}). We are dispatching a mechanic right away!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  textDecoration: "none",
                  textAlign: "center",
                  boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.2)",
                }}
              >
                <span>💬 WhatsApp</span>
              </a>
            </div>

            {activeEmergencyAlert.latitude && activeEmergencyAlert.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeEmergencyAlert.latitude},${activeEmergencyAlert.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "11px",
                  borderRadius: "12px",
                  backgroundColor: "#0F172A",
                  color: "#ffffff",
                  fontSize: "0.82rem",
                  fontWeight: "800",
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                <Navigation size={15} /> <span>Navigate on Google Maps</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                if (activeEmergencyAlert.id) handleUpdateRequestStatus(activeEmergencyAlert.id, "accepted");
                setActiveEmergencyAlert(null);
              }}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                backgroundColor: "#FF7900",
                color: "#ffffff",
                border: 0,
                fontSize: "0.88rem",
                fontWeight: "900",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                boxShadow: "0 4px 14px rgba(255, 121, 0, 0.35)",
              }}
            >
              ✅ Accept Request & Dispatch
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header
        style={{
          height: "70px",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.86rem",
                fontWeight: "700",
                color: "#ff8c32",
                padding: "8px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 140, 50, 0.1)",
                border: "1px solid rgba(255, 140, 50, 0.25)",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} /> <span>Back to Home</span>
            </button>
          ) : (
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.86rem",
                fontWeight: "700",
                color: "#ff8c32",
                padding: "8px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 140, 50, 0.1)",
                border: "1px solid rgba(255, 140, 50, 0.25)",
              }}
            >
              <ArrowLeft size={16} /> <span>Back to Home</span>
            </Link>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(145deg, #f27866, #db4642)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Wrench size={18} strokeWidth={2.4} />
            </span>
            <span style={{ fontFamily: "Manrope, sans-serif", fontSize: "1.2rem", fontWeight: "800", letterSpacing: "-0.04em" }}>
              Sevai<span style={{ color: "var(--red)" }}>Go</span> <small style={{ fontSize: "0.68rem", color: "var(--muted)" }}>PARTNER</small>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#dbe7dc",
                  color: "#426951",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                }}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: "700" }}>{user.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: "0.8rem", color: "var(--muted-dark)" }}>Mechanic Portal</span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Banner Section */}
        <section
          style={{
            background: "#FFFFFF",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
            borderRadius: "20px",
            padding: "36px 32px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ maxWidth: "660px", position: "relative", zIndex: 2 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 121, 0, 0.1)",
                color: "#FF7900",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "0.76rem",
                fontWeight: "800",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              <Sparkles size={14} /> SEVAIGO Mechanic Partner Portal
            </span>
            <h1 style={{ fontSize: "2.1rem", fontWeight: "800", letterSpacing: "-0.04em", margin: "0 0 12px", lineHeight: 1.25, color: "#0F172A" }}>
              Register Your Workshop. <br />
              <span style={{ color: "#FF7900" }}>Connect with Stranded Motorists.</span>
            </h1>
            <p style={{ fontSize: "0.95rem", color: "#64748B", lineHeight: 1.55, margin: 0 }}>
              Join Tamil Nadu’s leading real-time roadside assistance network. Register your garage, define your services, pin your precise workshop location, and receive immediate assistance calls when drivers and riders break down nearby.
            </p>
          </div>

          <div
            style={{
              position: "absolute",
              right: "24px",
              bottom: "-10px",
              opacity: 0.05,
              pointerEvents: "none",
              color: "#0F172A",
            }}
          >
            <Store size={220} strokeWidth={1} />
          </div>
        </section>

        {/* Alerts */}
        {errorMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 18px",
              borderRadius: "12px",
              backgroundColor: "var(--red-soft)",
              color: "var(--red)",
              border: "1px solid var(--red)",
              marginBottom: "24px",
              fontSize: "0.88rem",
              fontWeight: "600",
            }}
          >
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage("")}
              style={{ marginLeft: "auto", background: "none", border: 0, color: "inherit", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 18px",
              borderRadius: "12px",
              backgroundColor: "var(--green-soft)",
              color: "var(--green)",
              border: "1px solid var(--green)",
              marginBottom: "24px",
              fontSize: "0.88rem",
              fontWeight: "600",
            }}
          >
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage("")}
              style={{ marginLeft: "auto", background: "none", border: 0, color: "inherit", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* State 1: Owner Already Registered -> Display Dashboard */}
        {existingShop ? (
          <div>
            {/* Verification Status Banner */}
            <div
              style={{
                borderRadius: "16px",
                padding: "20px 24px",
                marginBottom: "24px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                backgroundColor:
                  existingShop.approvalStatus === "approved"
                    ? "var(--green-soft)"
                    : existingShop.approvalStatus === "rejected"
                    ? "var(--red-soft)"
                    : "#fff8ed",
                border:
                  existingShop.approvalStatus === "approved"
                    ? "1px solid #a3e2c3"
                    : existingShop.approvalStatus === "rejected"
                    ? "1px solid #f2b0ad"
                    : "1px solid #fedfa7",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <span
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor:
                      existingShop.approvalStatus === "approved"
                        ? "var(--green)"
                        : existingShop.approvalStatus === "rejected"
                        ? "var(--red)"
                        : "#d98d28",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  {existingShop.approvalStatus === "approved" ? (
                    <CheckCircle2 size={22} />
                  ) : existingShop.approvalStatus === "rejected" ? (
                    <ShieldAlert size={22} />
                  ) : (
                    <Clock3 size={22} />
                  )}
                </span>
                <div>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: "1.05rem",
                      fontWeight: "800",
                      color:
                        existingShop.approvalStatus === "approved"
                          ? "#0c6746"
                          : existingShop.approvalStatus === "rejected"
                          ? "#ab2e2a"
                          : "#9e6113",
                    }}
                  >
                    Verification Status:{" "}
                    {existingShop.approvalStatus === "approved"
                      ? "Approved & Live on Map"
                      : existingShop.approvalStatus === "rejected"
                      ? "Application Rejected"
                      : "Pending Review"}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color:
                        existingShop.approvalStatus === "approved"
                          ? "#156345"
                          : existingShop.approvalStatus === "rejected"
                          ? "#912d2a"
                          : "#8c5615",
                      lineHeight: 1.45,
                    }}
                  >
                    {existingShop.approvalStatus === "approved"
                      ? "Your workshop is verified and actively visible to motorists on SEVAIGO's live map within your service radius."
                      : existingShop.approvalStatus === "rejected"
                      ? "Your registration could not be verified at this time. Please contact partner support."
                      : "Your shop registration is under review by our safety and onboarding team. Once approved, your workshop pin will automatically appear on the live map for motorists nearby."}
                  </p>
                </div>
              </div>

              {/* Quick Live Availability Toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--muted-dark)" }}>
                  Mechanic Availability:
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability("available")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: (existingShop.availabilityStatus === "available" || existingShop.availabilityStatus === "free") ? "#159367" : "var(--border)",
                      backgroundColor: (existingShop.availabilityStatus === "available" || existingShop.availabilityStatus === "free") ? "var(--green)" : "var(--surface)",
                      color: (existingShop.availabilityStatus === "available" || existingShop.availabilityStatus === "free") ? "#ffffff" : "var(--muted-dark)",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: (existingShop.availabilityStatus === "available" || existingShop.availabilityStatus === "free") ? "#fff" : "#159367" }} />
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability("busy")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: existingShop.availabilityStatus === "busy" ? "#d69a48" : "var(--border)",
                      backgroundColor: existingShop.availabilityStatus === "busy" ? "#d69a48" : "var(--surface)",
                      color: existingShop.availabilityStatus === "busy" ? "#ffffff" : "var(--muted-dark)",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: existingShop.availabilityStatus === "busy" ? "#fff" : "#d69a48" }} />
                    Busy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability("offline")}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: existingShop.availabilityStatus === "offline" ? "#64748b" : "var(--border)",
                      backgroundColor: existingShop.availabilityStatus === "offline" ? "#64748b" : "var(--surface)",
                      color: existingShop.availabilityStatus === "offline" ? "#ffffff" : "var(--muted-dark)",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: existingShop.availabilityStatus === "offline" ? "#fff" : "#64748b" }} />
                    Offline
                  </button>
                </div>
              </div>
            </div>

            {/* Live Rescue Requests Panel */}
            <div
              style={{
                marginBottom: "24px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "20px 24px",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>🚨</span>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800" }}>
                    Customer Rescue Requests ({incomingRequests.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchIncomingRequests}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    background: "none",
                    border: "1px solid var(--border)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "var(--muted-dark)"
                  }}
                >
                  Refresh
                </button>
              </div>

              {incomingRequests.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted-dark)" }}>
                  No active breakdown assistance requests at the moment. When a motorist requests help for your shop, it will appear here instantly.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: req.status === "pending" ? "rgba(239, 68, 68, 0.05)" : "var(--bg)",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <strong>{req.userName || "Motorist"}</strong>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: "800",
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              backgroundColor: req.status === "accepted" ? "#dcfce7" : req.status === "pending" ? "#fee2e2" : req.status === "completed" ? "#e0f2fe" : "#f1f5f9",
                              color: req.status === "accepted" ? "#16a34a" : req.status === "pending" ? "#dc2626" : req.status === "completed" ? "#0284c7" : "#64748b",
                            }}
                          >
                            {req.status}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "var(--muted-dark)" }}>
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "4px" }}>
                          Problem: <strong>{req.issue}</strong> • Vehicle: <strong>{req.vehicleType?.toUpperCase() || "VEHICLE"}</strong>
                        </div>
                        {req.notes && (
                          <div style={{ fontSize: "0.8rem", color: "var(--muted-dark)", marginBottom: "4px", fontStyle: "italic" }}>
                            "{req.notes}"
                          </div>
                        )}
                        {req.photoUrl && (
                          <div style={{ marginTop: "6px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted-dark)", fontWeight: "700" }}>Problem Photo:</span>
                            <a href={req.photoUrl} target="_blank" rel="noopener noreferrer">
                              <img src={req.photoUrl} alt="Problem Photo" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", border: "1px solid var(--border)" }} />
                            </a>
                          </div>
                        )}
                        {req.userPhone && (
                          <div style={{ fontSize: "0.82rem", color: "var(--muted-dark)" }}>
                            Phone: <a href={`tel:${req.userPhone}`} style={{ color: "#2563eb", fontWeight: "700" }}>{req.userPhone}</a>
                          </div>
                        )}
                        {req.address && (
                          <div style={{ fontSize: "0.8rem", color: "var(--muted-dark)", marginTop: "2px" }}>
                            Location: {req.address}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        {req.userPhone && (
                          <>
                            <a
                              href={`tel:${req.userPhone}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "7px 14px",
                                borderRadius: "8px",
                                backgroundColor: "#2563eb",
                                color: "#fff",
                                fontSize: "0.82rem",
                                fontWeight: "700",
                                textDecoration: "none",
                              }}
                            >
                              <Phone size={14} /> Call
                            </a>
                            <a
                              href={`https://wa.me/91${req.userPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                                `Hello ${req.userName || "Customer"}, I am from ${existingShop?.shopName || "SevaiGo Partner"}. I received your breakdown request (${req.issue}). I am on my way.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "7px 14px",
                                borderRadius: "8px",
                                backgroundColor: "#16a34a",
                                color: "#fff",
                                fontSize: "0.82rem",
                                fontWeight: "700",
                                textDecoration: "none",
                              }}
                            >
                              💬 WhatsApp
                            </a>
                          </>
                        )}

                        {req.latitude && req.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "7px 14px",
                              borderRadius: "8px",
                              backgroundColor: "#0ea5e9",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              textDecoration: "none",
                            }}
                          >
                            <Navigation size={14} /> Navigate
                          </a>
                        )}

                        {["accepted", "arriving", "on_the_way", "arrived", "repairing"].includes(req.status) && (
                          <button
                            type="button"
                            onClick={() => toggleShareLocation(req.id)}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: "1px solid",
                              borderColor: sharingLocationId === req.id ? "#16a34a" : "var(--border)",
                              backgroundColor: sharingLocationId === req.id ? "#16a34a" : "var(--surface)",
                              color: sharingLocationId === req.id ? "#fff" : "var(--text)",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <LocateFixed size={14} />
                            {sharingLocationId === req.id ? "Live GPS Active" : "Share Live Location"}
                          </button>
                        )}

                        {req.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateRequestStatus(req.id, "accepted")}
                              style={{
                                padding: "7px 14px",
                                borderRadius: "8px",
                                border: 0,
                                backgroundColor: "#16a34a",
                                color: "#fff",
                                fontSize: "0.82rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Accept Rescue
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateRequestStatus(req.id, "declined")}
                              style={{
                                padding: "7px 14px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--surface)",
                                color: "var(--text)",
                                fontSize: "0.82rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {req.status === "accepted" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, "arriving")}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: 0,
                              backgroundColor: "#FF7900",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            🛵 On The Way
                          </button>
                        )}

                        {req.status === "arriving" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, "arrived")}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: 0,
                              backgroundColor: "#16a34a",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            📍 Mark Arrived
                          </button>
                        )}

                        {req.status === "arrived" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, "repairing")}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: 0,
                              backgroundColor: "#3b82f6",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            🔧 Start Repairing
                          </button>
                        )}

                        {["accepted", "arriving", "arrived", "repairing"].includes(req.status) && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRequestStatus(req.id, "completed")}
                            style={{
                              padding: "7px 14px",
                              borderRadius: "8px",
                              border: 0,
                              backgroundColor: "#0284c7",
                              color: "#fff",
                              fontSize: "0.82rem",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dashboard Overview Cards */}
            <div style={{ display: "grid", gridTemplateColumns: editingShop ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              {!editingShop ? (
                <>
                  {/* Shop Details Card */}
                  <div
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "24px",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--red)", textTransform: "uppercase" }}>
                          Registered Workshop
                        </span>
                        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", margin: "4px 0 6px" }}>{existingShop.shopName}</h2>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted-dark)", display: "flex", alignItems: "center", gap: "5px" }}>
                          <UserRound size={14} /> Owner: <strong>{existingShop.ownerName}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingShop(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          backgroundColor: "var(--surface-soft)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "7px 13px",
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          color: "var(--heading)",
                          cursor: "pointer",
                        }}
                      >
                        <Edit3 size={14} /> Edit Details
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.86rem", color: "var(--muted-dark)" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <MapPin size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "2px" }} />
                        <span>
                          {existingShop.address}
                          {existingShop.city ? `, ${existingShop.city}` : ""}
                          {existingShop.pincode ? ` - ${existingShop.pincode}` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Phone size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                        <span>Contact: <strong>{existingShop.phone}</strong> {existingShop.shopPhone && existingShop.shopPhone !== existingShop.phone ? `(Shop: ${existingShop.shopPhone})` : ""}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Clock3 size={16} style={{ color: "var(--blue)", flexShrink: 0 }} />
                        <span>
                          Working Hours: <strong>{existingShop.openTime} – {existingShop.closeTime}</strong>
                          {existingShop.workingDays && existingShop.workingDays.length > 0 ? ` (${existingShop.workingDays.join(", ")})` : ""}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--muted-dark)", display: "block", marginBottom: "8px" }}>
                        Services Offered:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {existingShop.specializations?.map((spec) => (
                          <span
                            key={spec}
                            style={{
                              backgroundColor: "var(--surface-soft)",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              color: "var(--heading)",
                            }}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Location Map Preview */}
                  <div
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "20px",
                      boxShadow: "var(--shadow)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={17} style={{ color: "var(--red)" }} />
                        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>Pinned Workshop Location</h3>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-dark)", fontFamily: "monospace" }}>
                        {existingShop.latitude.toFixed(4)}, {existingShop.longitude.toFixed(4)}
                      </span>
                    </div>

                    <div style={{ height: "260px", borderRadius: "12px", overflow: "hidden", position: "relative" }}>
                      <MechanicMap
                        location={{
                          latitude: existingShop.latitude,
                          longitude: existingShop.longitude,
                          label: existingShop.shopName,
                          source: "demo",
                        }}
                        pickedLocation={{ latitude: existingShop.latitude, longitude: existingShop.longitude }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Edit Form Mode */
                <form
                  onSubmit={handleSaveEdit}
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "28px",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0 }}>Edit Workshop Details</h2>
                    <button
                      type="button"
                      onClick={() => setEditingShop(false)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: "var(--muted-dark)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Shop Name
                      <input
                        type="text"
                        required
                        value={editDraft.shopName}
                        onChange={(e) => setEditDraft({ ...editDraft, shopName: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Owner Full Name
                      <input
                        type="text"
                        required
                        value={editDraft.ownerName}
                        onChange={(e) => setEditDraft({ ...editDraft, ownerName: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Mobile Number
                      <input
                        type="tel"
                        required
                        value={editDraft.phone}
                        onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Shop Landline / Alternate Phone
                      <input
                        type="tel"
                        value={editDraft.shopPhone}
                        onChange={(e) => setEditDraft({ ...editDraft, shopPhone: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "8px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Full Street Address
                      <input
                        type="text"
                        required
                        value={editDraft.address}
                        onChange={(e) => handleEditAddressFieldChange("address", e.target.value)}
                        onBlur={() => handleSyncEditAddressToMap()}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      City
                      <input
                        type="text"
                        required
                        value={editDraft.city}
                        onChange={(e) => handleEditAddressFieldChange("city", e.target.value)}
                        onBlur={() => handleSyncEditAddressToMap()}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      PIN Code
                      <input
                        type="text"
                        required
                        value={editDraft.pincode}
                        onChange={(e) => handleEditAddressFieldChange("pincode", e.target.value)}
                        onBlur={() => handleSyncEditAddressToMap()}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                  </div>

                  {/* Address to Map Sync Trigger & Status */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleSyncEditAddressToMap()}
                      disabled={syncingMapLocation}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#FF7900",
                        color: "#fff",
                        border: 0,
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <MapPin size={13} />
                      {syncingMapLocation ? "Locating on Map..." : "📍 Auto-Move Map Pin to this Address"}
                    </button>
                    {syncSuccessMsg && (
                      <span style={{ fontSize: "0.76rem", color: "#16a34a", fontWeight: "700" }}>
                        {syncSuccessMsg}
                      </span>
                    )}
                  </div>

                  {/* Hours */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Opening Time
                      <input
                        type="time"
                        required
                        value={editDraft.openTime}
                        onChange={(e) => setEditDraft({ ...editDraft, openTime: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Closing Time
                      <input
                        type="time"
                        required
                        value={editDraft.closeTime}
                        onChange={(e) => setEditDraft({ ...editDraft, closeTime: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                  </div>

                  {/* Interactive Map Picker for Edit */}
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>Update Pin on Live Map</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-dark)" }}>Click map or drag marker to update address</span>
                    </div>
                    <div style={{ height: "260px", borderRadius: "12px", overflow: "hidden" }}>
                      <MechanicMap
                        location={{
                          latitude: editDraft.latitude,
                          longitude: editDraft.longitude,
                          label: editDraft.shopName,
                          source: "demo",
                        }}
                        pickerMode={true}
                        pickedLocation={{ latitude: editDraft.latitude, longitude: editDraft.longitude }}
                        onPickLocation={handlePickEditLocation}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setEditingShop(false)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--surface-soft)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      style={{
                        padding: "10px 24px",
                        borderRadius: "8px",
                        border: 0,
                        backgroundColor: "var(--red)",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "800",
                      }}
                    >
                      {savingEdit ? "Saving Updates..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* State 2: New Registration Form */
          <form
            onSubmit={handleRegisterSubmit}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "36px 32px",
              boxShadow: "var(--shadow)",
            }}
          >
            {/* Step 0: First Shop Front Photo */}
            <div
              style={{
                marginBottom: "32px",
                padding: "24px",
                borderRadius: "16px",
                backgroundColor: "#fff8f3",
                border: "2px dashed #f97316",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#FF7900",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                  }}
                >
                  📸
                </span>
                <div>
                  <h2 style={{ fontSize: "1.18rem", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                    First Shop Photo (Garage Front View) *
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                    Attach an original photo of your workshop entrance so breakdown customers can easily recognize your garage.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", alignItems: "center" }}>
                {shopPhotoPreview || workshopPhotoUrl ? (
                  <div style={{ position: "relative", width: "170px", height: "115px", borderRadius: "12px", overflow: "hidden", border: "2px solid #FF7900", boxShadow: "0 4px 12px rgba(255,121,0,0.15)" }}>
                    <img
                      src={shopPhotoPreview || workshopPhotoUrl}
                      alt="Shop Front"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShopPhotoPreview("");
                        setWorkshopPhotoUrl("");
                      }}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.75)",
                        color: "#ffffff",
                        border: 0,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      width: "170px",
                      height: "115px",
                      borderRadius: "12px",
                      border: "2px dashed #FF7900",
                      backgroundColor: "rgba(255, 121, 0, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      color: "#c2410c",
                      fontSize: "0.8rem",
                      fontWeight: "800",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <Camera size={26} className="text-[#FF7900]" />
                    <span>Upload Shop Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleShopPhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}

                <div style={{ flex: 1, minWidth: "240px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                    <span>Or Workshop Image URL:</span>
                    <input
                      type="url"
                      placeholder="https://images.example.com/shop-photo.jpg"
                      value={workshopPhotoUrl}
                      onChange={(e) => {
                        setWorkshopPhotoUrl(e.target.value);
                        if (!shopPhotoPreview) setShopPhotoPreview(e.target.value);
                      }}
                      style={{
                        height: "44px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        padding: "0 14px",
                        backgroundColor: "var(--bg)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Step 1: Shop & Mechanic Details */}
            <div style={{ marginBottom: "36px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "var(--red-soft)",
                    color: "var(--red)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                  }}
                >
                  1
                </span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Shop & Mechanic Details</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Shop / Garage Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Balaji Motors & Garage"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Owner Full Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kannan"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Primary Phone Number (Customer Calls & Verification) *
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!whatsappNumber) setWhatsappNumber(e.target.value);
                    }}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                  <span style={{ fontSize: "0.74rem", color: "var(--muted-dark)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
                    Customers will call this number directly during bike breakdowns.
                  </span>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  WhatsApp Number (for Instant Customer SOS Alerts) *
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1.5px solid #16a34a",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                  <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: "600" }}>
                    💬 Customer SOS breakdown requests & GPS location will arrive directly to this WhatsApp.
                  </span>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Additional / Landline Phone Number <small style={{ color: "var(--muted)" }}>(Optional)</small>
                  <input
                    type="tel"
                    placeholder="Alternate mobile or shop landline"
                    value={additionalPhone}
                    onChange={(e) => {
                      setAdditionalPhone(e.target.value);
                      setShopPhone(e.target.value);
                    }}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Email ID <small style={{ color: "var(--muted)" }}>(Optional)</small>
                  <input
                    type="email"
                    placeholder="workshop@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                {!user && (
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                    Create Password (to manage your dashboard) *
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        height: "44px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        padding: "0 14px",
                        backgroundColor: "var(--bg)",
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Step 2: Vehicle Types Supported */}
            <div style={{ marginBottom: "36px", paddingTop: "28px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "var(--red-soft)",
                    color: "var(--red)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                  }}
                >
                  2
                </span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Vehicle Types Serviced *</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                {VEHICLE_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const active = vehicleTypes.includes(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => toggleVehicleType(value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid",
                        borderColor: active ? "var(--red)" : "var(--border)",
                        backgroundColor: active ? "var(--red-soft)" : "var(--bg)",
                        color: active ? "var(--red)" : "var(--muted-dark)",
                        fontWeight: "700",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Icon size={18} />
                      <span style={{ flex: 1 }}>{label}</span>
                      {active && <Check size={16} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Exact Location Picker with Location Type Option */}
            <div style={{ marginBottom: "36px", paddingTop: "28px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "var(--red-soft)",
                      color: "var(--red)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: "800",
                      fontSize: "0.85rem",
                    }}
                  >
                    3
                  </span>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Exact Workshop Location</h2>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted-dark)" }}>
                      Type your area or pin on the live map so nearby breakdown motorists can find you within 7 km.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLocating}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #159367",
                    backgroundColor: "var(--green-soft)",
                    color: "var(--green)",
                    fontWeight: "700",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  <LocateFixed size={16} />
                  <span>{geoLocating ? "Getting GPS..." : "Use Current GPS Location"}</span>
                </button>
              </div>

              {/* Location Type Option: Type Area name to auto-pin on map */}
              <div
                style={{
                  marginBottom: "18px",
                  backgroundColor: "#fff8f0",
                  border: "1.5px solid #fedfa7",
                  borderRadius: "14px",
                  padding: "16px 18px",
                }}
              >
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", fontWeight: "800", color: "#92400e" }}>
                  <span>📍 Location Type Option (Type Area name to automatically place pin on map):</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="Type area name (e.g. Chromepet, Tambaram, Anna Nagar, T. Nagar, Coimbatore)..."
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSearchLocation();
                        }
                      }}
                      style={{
                        flex: 1,
                        height: "44px",
                        borderRadius: "10px",
                        border: "1.5px solid #f97316",
                        padding: "0 14px",
                        backgroundColor: "#ffffff",
                        fontSize: "0.88rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchLocation()}
                      disabled={isSearchingLocation || !locationQuery.trim()}
                      style={{
                        padding: "0 18px",
                        height: "44px",
                        borderRadius: "10px",
                        backgroundColor: "#f97316",
                        color: "#ffffff",
                        border: 0,
                        fontSize: "0.85rem",
                        fontWeight: "800",
                        cursor: isSearchingLocation ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Search size={16} />
                      <span>{isSearchingLocation ? "Locating..." : "Auto-Locate"}</span>
                    </button>
                  </div>
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                  <span style={{ fontSize: "0.74rem", color: "#78350f", fontWeight: "700" }}>Quick Areas:</span>
                  {["Chromepet", "Tambaram", "Guindy", "Anna Nagar", "Velachery", "Coimbatore", "Madurai", "Salem"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setLocationQuery(preset);
                        void handleSearchLocation(preset);
                      }}
                      style={{
                        fontSize: "0.72rem",
                        padding: "3px 9px",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #fedfa7",
                        color: "#c2410c",
                        cursor: "pointer",
                        fontWeight: "700",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "8px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700", gridColumn: "span 2" }}>
                  Full Workshop Address *
                  <input
                    type="text"
                    required
                    placeholder="Shop door number, building name, street, landmark"
                    value={address}
                    onChange={(e) => handleRegAddressFieldChange("address", e.target.value)}
                    onBlur={() => handleSyncRegisterAddressToMap()}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  City *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Erode / Coimbatore / Chennai"
                    value={city}
                    onChange={(e) => handleRegAddressFieldChange("city", e.target.value)}
                    onBlur={() => handleSyncRegisterAddressToMap()}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  PIN Code *
                  <input
                    type="text"
                    required
                    placeholder="e.g. 638452"
                    maxLength={10}
                    value={pincode}
                    onChange={(e) => handleRegAddressFieldChange("pincode", e.target.value)}
                    onBlur={() => handleSyncRegisterAddressToMap()}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>
              </div>

              {/* Address to Map Sync Trigger & Status */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleSyncRegisterAddressToMap()}
                  disabled={syncingMapLocation}
                  style={{
                    padding: "7px 15px",
                    borderRadius: "8px",
                    backgroundColor: "#FF7900",
                    color: "#fff",
                    border: 0,
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MapPin size={13} />
                  {syncingMapLocation ? "Locating on Map..." : "📍 Auto-Move Map Pin to this Address"}
                </button>
                {syncSuccessMsg && (
                  <span style={{ fontSize: "0.76rem", color: "#16a34a", fontWeight: "700" }}>
                    {syncSuccessMsg}
                  </span>
                )}
              </div>

              {/* Interactive Leaflet Location Picker */}
              <div
                style={{
                  height: "360px",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  position: "relative",
                  marginBottom: "8px",
                }}
              >
                <MechanicMap
                  location={{
                    latitude: pickedCoords.latitude,
                    longitude: pickedCoords.longitude,
                    label: shopName || "Your Shop Location",
                    source: "demo",
                  }}
                  pickerMode={true}
                  pickedLocation={pickedCoords}
                  onPickLocation={handlePickRegisterLocation}
                />

                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "12px",
                    zIndex: 400,
                    backgroundColor: "rgba(20, 30, 40, 0.88)",
                    backdropFilter: "blur(4px)",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <MapPin size={13} style={{ color: "var(--red)" }} />
                  <span>Lat: {pickedCoords.latitude.toFixed(6)} | Lng: {pickedCoords.longitude.toFixed(6)}</span>
                </div>
              </div>
              <small style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                Tip: Click anywhere on the map or drag the orange marker to place your shop pin exactly at your entrance.
              </small>
            </div>

            {/* Step 4: Services Offered & Hours */}
            <div style={{ marginBottom: "36px", paddingTop: "28px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "var(--red-soft)",
                    color: "var(--red)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                  }}
                >
                  4
                </span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Services, Hours & Charges</h2>
              </div>

              {/* Services Offered */}
              <div style={{ marginBottom: "22px" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: "700", display: "block", marginBottom: "8px" }}>
                  Services Offered * (Check all that apply)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                  {SPECIALTY_OPTIONS.map((spec) => {
                    const active = specializations.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => toggleSpecialty(spec)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor: active ? "var(--blue)" : "var(--border)",
                          backgroundColor: active ? "var(--blue-soft)" : "var(--bg)",
                          color: active ? "var(--blue)" : "var(--muted-dark)",
                          fontSize: "0.8rem",
                          fontWeight: "700",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <span>{spec}</span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spare Parts in Stock */}
              <div style={{ marginBottom: "22px" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: "700", display: "block", marginBottom: "8px" }}>
                  Spare-Parts in Stock (Select what you carry for roadside rescue)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px" }}>
                  {SPARE_PART_OPTIONS.map((part) => {
                    const active = spareParts.includes(part);
                    return (
                      <button
                        type="button"
                        key={part}
                        onClick={() => toggleSparePart(part)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor: active ? "#ff8c32" : "var(--border)",
                          backgroundColor: active ? "rgba(255, 140, 50, 0.12)" : "var(--bg)",
                          color: active ? "#ff8c32" : "var(--muted-dark)",
                          fontSize: "0.8rem",
                          fontWeight: "700",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <span>{part}</span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Days */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.84rem", fontWeight: "700" }}>Working Days *</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setWorkingDays(DAYS_OF_WEEK)}
                      style={{ fontSize: "0.72rem", color: "var(--blue)", background: "none", border: 0, cursor: "pointer", fontWeight: "700" }}
                    >
                      All 7 Days
                    </button>
                    <span style={{ color: "var(--border)" }}>|</span>
                    <button
                      type="button"
                      onClick={() => setWorkingDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])}
                      style={{ fontSize: "0.72rem", color: "var(--blue)", background: "none", border: 0, cursor: "pointer", fontWeight: "700" }}
                    >
                      Mon – Sat
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {DAYS_OF_WEEK.map((day) => {
                    const active = workingDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleWorkingDay(day)}
                        style={{
                          width: "50px",
                          height: "38px",
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor: active ? "var(--red)" : "var(--border)",
                          backgroundColor: active ? "var(--red)" : "var(--bg)",
                          color: active ? "#ffffff" : "var(--muted-dark)",
                          fontWeight: "800",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours & Experience & Price Range */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Opening Time *
                  <input
                    type="time"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Closing Time *
                  <input
                    type="time"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Min Charge (₹)
                  <input
                    type="number"
                    min="0"
                    placeholder="250"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Typical Max Charge (₹)
                  <input
                    type="number"
                    min="0"
                    placeholder="2500"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                </label>
              </div>

              {/* Workshop Photo URL */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                Workshop Photo URL <small style={{ color: "var(--muted)" }}>(Optional, e.g. web photo or Google Maps photo)</small>
                <input
                  type="url"
                  placeholder="https://..."
                  value={workshopPhotoUrl}
                  onChange={(e) => setWorkshopPhotoUrl(e.target.value)}
                  style={{
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    padding: "0 14px",
                    backgroundColor: "var(--bg)",
                  }}
                />
              </label>
            </div>

            {/* Verification Disclaimer & Submit Button */}
            <div
              style={{
                backgroundColor: "#fff8ed",
                border: "1px solid #fedfa7",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "28px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Info size={22} style={{ color: "#d98d28", flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.82rem", color: "#8c5615", lineHeight: 1.5 }}>
                <strong>Important Notice on Verification:</strong> Submitting this registration does not automatically make your workshop visible on the public map. Every mechanic shop is independently reviewed and verified by the SEVAIGO team to verify identity, credentials, and location accuracy before public activation.
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "12px",
                backgroundColor: submitting ? "var(--red-dark)" : "var(--red)",
                opacity: submitting ? 0.8 : 1,
                color: "#ffffff",
                border: 0,
                fontSize: "1rem",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 6px 20px rgba(227, 81, 75, 0.3)",
                transition: "opacity 0.2s ease, background-color 0.2s ease",
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      border: "2.5px solid rgba(255, 255, 255, 0.35)",
                      borderTopColor: "#ffffff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>Registering Workshop...</span>
                </>
              ) : (
                <>
                  <span>Complete Shop Registration</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
