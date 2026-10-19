"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bike, CarFront, Check, CheckCircle2, Clock3,
  Compass, Info, LocateFixed, LogOut, MapPin, Navigation, Phone, ShieldAlert,
  ShieldCheck, Sparkles, Store, Truck, UserRound, Wrench, X, AlertCircle, Edit3
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
  const [sharingLocationId, setSharingLocationId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

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
            setExistingShop({
              id: matched.id,
              shopName: matched.shop_name || "Workshop",
              ownerName: matched.owner_name || "Mechanic",
              phone: matched.phone || "",
              shopPhone: matched.phone || "",
              address: matched.address || "Chennai",
              city: "Chennai",
              latitude: matched.lat || DEMO_LOCATION.latitude,
              longitude: matched.lng || DEMO_LOCATION.longitude,
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
              city: "Chennai",
              pincode: "",
              openTime: "08:00",
              closeTime: "21:00",
              priceMin: "300",
              priceMax: "2500",
              availabilityStatus: "free",
              specializations: servicesList,
              workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              latitude: matched.lat || DEMO_LOCATION.latitude,
              longitude: matched.lng || DEMO_LOCATION.longitude,
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
          setExistingShop(data.shop);
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
        email: email.trim() || undefined,
        password: password || undefined,
        shopName: shopName.trim(),
        shopPhone: shopPhone.trim() || phone.trim(),
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
        photos: workshopPhotoUrl.trim() ? [workshopPhotoUrl.trim()] : ["/images/workshop-1.jpg"],
        spareParts,
        businessDoc: businessDoc.trim() || undefined,
      };

      // Server-side registration call: prevents CORS, network blocks, and credentials exposure
      const res = await fetch("/api/register-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Registration failed with status ${res.status}. Please try again.`);
      }

      const s = data.shop || {};
      const returnedServices = Array.isArray(s.services) ? s.services : servicesList;

      setExistingShop({
        id: s.id || `shop-${Date.now()}`,
        shopName: s.shop_name || s.shopName || shopName.trim(),
        ownerName: s.owner_name || s.ownerName || ownerName.trim(),
        phone: s.phone || (shopPhone.trim() || phone.trim()),
        shopPhone: s.phone || (shopPhone.trim() || phone.trim()),
        address: s.address || fullAddress,
        city: city.trim() || "Chennai",
        latitude: s.lat || pickedCoords.latitude,
        longitude: s.lng || pickedCoords.longitude,
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
      const msg = err?.message || "Registration failed. Please check your network and try again.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setErrorMessage("Network error: Could not reach the registration server. Please check your internet connection.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch incoming live rescue requests for this workshop
  const fetchIncomingRequests = useCallback(async () => {
    if (!existingShop) return;
    try {
      const res = await fetch("/api/breakdowns?mode=incoming");
      if (res.ok) {
        const data = await res.json();
        setIncomingRequests(data.breakdowns || []);
      }
    } catch {
      // ignore
    }
  }, [existingShop]);

  useEffect(() => {
    if (existingShop) {
      fetchIncomingRequests();
      const interval = setInterval(fetchIncomingRequests, 10000);
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
            <span style={{ fontSize: "0.8rem", color: "var(--muted-dark)" }}>New Partner Registration</span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Banner Section */}
        <section
          style={{
            background: "linear-gradient(135deg, #1b2838 0%, #151e2a 100%)",
            color: "#ffffff",
            borderRadius: "20px",
            padding: "36px 32px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 12px 36px rgba(10, 20, 30, 0.15)",
          }}
        >
          <div style={{ maxWidth: "660px", position: "relative", zIndex: 2 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(240, 90, 62, 0.2)",
                color: "#ff7d63",
                padding: "4px 12px",
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
            <h1 style={{ fontSize: "2.1rem", fontWeight: "800", letterSpacing: "-0.04em", margin: "0 0 12px", lineHeight: 1.25 }}>
              Register Your Workshop. <br />
              <span style={{ color: "#f27866" }}>Connect with Stranded Motorists.</span>
            </h1>
            <p style={{ fontSize: "0.95rem", color: "#b9c7d4", lineHeight: 1.55, margin: 0 }}>
              Join Tamil Nadu’s leading real-time roadside assistance network. Register your garage, define your services, pin your precise workshop location, and receive immediate assistance calls when drivers and riders break down nearby.
            </p>
          </div>

          <div
            style={{
              position: "absolute",
              right: "24px",
              bottom: "-10px",
              opacity: 0.12,
              pointerEvents: "none",
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

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      Full Street Address
                      <input
                        type="text"
                        required
                        value={editDraft.address}
                        onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      City
                      <input
                        type="text"
                        required
                        value={editDraft.city}
                        onChange={(e) => setEditDraft({ ...editDraft, city: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem", fontWeight: "700" }}>
                      PIN Code
                      <input
                        type="text"
                        required
                        value={editDraft.pincode}
                        onChange={(e) => setEditDraft({ ...editDraft, pincode: e.target.value })}
                        style={{ height: "40px", borderRadius: "8px", border: "1px solid var(--border)", padding: "0 12px", backgroundColor: "var(--bg)" }}
                      />
                    </label>
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
                      <span style={{ fontSize: "0.75rem", color: "var(--muted-dark)" }}>Click map or drag marker</span>
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
                        onPickLocation={(coords) => setEditDraft({ ...editDraft, ...coords })}
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
            {/* Step 1: Owner Details */}
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
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Owner & Account Credentials</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
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
                  Mobile Number (for OTP & Customer Calls) *
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    Mobile Verification: Direct verified communication mode.
                  </span>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Optional Business Verification (GST / Trade License)
                  <input
                    type="text"
                    placeholder="e.g. GSTIN / TN-TRADE-2024 / ID"
                    value={businessDoc}
                    onChange={(e) => setBusinessDoc(e.target.value)}
                    style={{
                      height: "44px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      padding: "0 14px",
                      backgroundColor: "var(--bg)",
                    }}
                  />
                  <span style={{ fontSize: "0.74rem", color: "var(--muted-dark)" }}>
                    Speeds up verification and boosts your trusted partner badge.
                  </span>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700" }}>
                  Email Address <small style={{ color: "var(--muted)" }}>(Optional)</small>
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

            {/* Step 2: Workshop Identity & Types */}
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
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>Shop Details & Vehicle Types</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "18px" }}>
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
                  Shop Phone / Landline (Customer Facing)
                  <input
                    type="tel"
                    placeholder="Landline or shop mobile"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
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

              {/* Vehicle Types Supported */}
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "0.84rem", fontWeight: "700", display: "block", marginBottom: "8px" }}>
                  Vehicle Types Serviced * (Select all that apply)
                </span>
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
            </div>

            {/* Step 3: Location Picker with Live Leaflet Map */}
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
                      Pinpoint your garage on the live map so motorists can get turn-by-turn navigation.
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

              {/* Address inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", fontWeight: "700", gridColumn: "span 2" }}>
                  Full Workshop Address *
                  <input
                    type="text"
                    required
                    placeholder="Shop door number, building name, street, landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    placeholder="e.g. Chennai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
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
                    placeholder="600001"
                    maxLength={10}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
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
                  onPickLocation={(coords) => setPickedCoords(coords)}
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
