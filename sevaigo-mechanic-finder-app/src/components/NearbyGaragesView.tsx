"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bike,
  Compass,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Store,
  Wrench,
} from "lucide-react";
import type { MechanicView } from "@/lib/mechanic-shared";
import type { MapLocation } from "./MechanicMap";
import MechanicMap from "./MechanicMap";

interface NearbyGaragesViewProps {
  onBack: () => void;
  shops: MechanicView[];
  location: MapLocation;
  onBookShop: (shop: MechanicView) => void;
  onCallShop: (shop: MechanicView) => void;
}

export default function NearbyGaragesView({
  onBack,
  shops,
  location,
  onBookShop,
  onCallShop,
}: NearbyGaragesViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "service" | "parts" | "tyres">("all");
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0]?.id || "default-shop");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.shopName.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filter === "service") {
        return s.specializations.some((spec) =>
          ["general service", "engine repair", "service"].some((k) =>
            spec.toLowerCase().includes(k)
          )
        );
      }
      if (filter === "parts") {
        return s.specializations.some((spec) =>
          ["spare", "parts", "battery", "oil"].some((k) =>
            spec.toLowerCase().includes(k)
          )
        );
      }
      if (filter === "tyres") {
        return s.specializations.some((spec) =>
          ["tyre", "tire", "puncture"].some((k) => spec.toLowerCase().includes(k))
        );
      }
      return true;
    });
  }, [shops, search, filter]);

  const activeShop: MechanicView =
    filteredShops.find((s) => s.id === selectedShopId) ||
    filteredShops[0] ||
    shops[0] || {
      id: "riders-garage",
      shopName: "Rider's Garage",
      ownerName: "Ajmal Hussain",
      ownerPhoto: "/images/owner-1.jpg",
      phone: "+91 98765 43210",
      shopPhone: "+91 98765 43210",
      address: "Anna Nagar Main Road, Chennai",
      latitude: 13.0827,
      longitude: 80.2707,
      vehicleTypes: ["2w", "4w"],
      specializations: ["Bike Service", "General Repair", "Spare Parts"],
      openTime: "08:00",
      closeTime: "21:00",
      rating: 4.6,
      reviewCount: 124,
      photos: ["/images/workshop-1.jpg"],
      isVerified: true,
      availabilityStatus: "available",
      priceMin: 300,
      priceMax: 2500,
      yearsExperience: 7,
      distanceKm: 1.2,
      etaMinutes: 10,
      isOpen: true,
      city: "Chennai",
      isRegisteredOwner: true,
    };

  return (
    <div className="relative w-full min-h-screen bg-[#FFFFFF] text-[#0F172A] flex flex-col font-['DM_Sans',sans-serif]">
      {/* Top Floating Header & Search Bar */}
      <div className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 pt-3 pb-3">
        <div className="max-w-xl mx-auto flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-lg font-extrabold text-[#0F172A] tracking-tight font-['Manrope']">
            Nearby Garages
          </h1>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            className="px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#FF7900] hover:bg-[#F1F5F9] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Compass size={14} />
            <span>{viewMode === "map" ? "List View" : "Map View"}</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="max-w-xl mx-auto relative flex items-center rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#FF7900] transition-colors mb-3">
          <span className="pl-3.5 text-[#64748B]">
            <Search size={17} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search garage or area..."
            className="w-full bg-transparent px-3 py-2.5 text-xs md:text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="max-w-xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all" as const, label: "All" },
            { id: "service" as const, label: "Service" },
            { id: "parts" as const, label: "Spare Parts" },
            { id: "tyres" as const, label: "Tyres" },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#FF7900] text-white shadow-xs"
                    : "bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map or List Container */}
      <div className="flex-1 relative w-full pb-36">
        {viewMode === "map" ? (
          <div className="relative w-full h-[calc(100vh-190px)] min-h-[460px]">
            {/* Interactive Leaflet Map */}
            <MechanicMap
              shops={filteredShops}
              location={location}
              selectedId={activeShop.id}
              onSelect={(id) => setSelectedShopId(id)}
              onCallMechanic={onCallShop}
            />

            {/* Subtle Gradient Vignette Over Map Bottom */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF]/60 to-transparent pointer-events-none z-10" />
          </div>
        ) : (
          <div className="max-w-xl mx-auto px-4 py-4 flex flex-col gap-3">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => setSelectedShopId(shop.id)}
                className={`p-4 rounded-2xl bg-[#FFFFFF] border transition-all cursor-pointer flex items-center gap-3.5 ${
                  selectedShopId === shop.id
                    ? "border-[#FF7900] shadow-[0_0_20px_rgba(255,121,0,0.15)]"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                }`}
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#E2E8F0]">
                  <img
                    src={shop.photos[0] || "/images/workshop-1.jpg"}
                    alt={shop.shopName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-[#0F172A] truncate">
                      {shop.shopName}
                    </h3>
                    <span className="text-xs font-bold text-[#D97706] flex items-center gap-1 shrink-0">
                      <Star size={12} fill="currentColor" /> {shop.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] truncate mb-2">
                    {shop.address}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748B]">
                      {shop.distanceKm.toFixed(1)} km away • ~{shop.etaMinutes} min
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookShop(shop);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Book Repair
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Bottom Selected Garage Card */}
        {activeShop && (
          <div className="fixed bottom-16 inset-x-0 z-30 px-4 pointer-events-none">
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#E2E8F0] shadow-xl pointer-events-auto">
              <div className="flex items-center gap-3.5 mb-3.5">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#0D1117] shrink-0 border border-white/10 relative">
                  <img
                    src={activeShop.photos[0] || "/images/workshop-1.jpg"}
                    alt={activeShop.shopName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight truncate">
                      {activeShop.shopName}
                    </h2>
                    <span className="text-xs font-semibold text-[#A5ADB8] shrink-0 flex items-center gap-1">
                      <Navigation size={12} className="text-[#FF7900]" />
                      <span>{activeShop.distanceKm.toFixed(1)} km</span>
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 text-xs text-[#A5ADB8] mb-1.5">
                    <span className="font-bold text-[#FFB020] flex items-center gap-0.5">
                      <Star size={13} fill="currentColor" /> {activeShop.rating.toFixed(1)}
                    </span>
                    <span>({activeShop.reviewCount || 124})</span>
                  </div>

                  {/* Service tags */}
                  <div className="text-[11px] text-[#A5ADB8] truncate">
                    <span>Bike Service</span>
                    <span className="mx-1 text-white/30">|</span>
                    <span>General Repair</span>
                    <span className="mx-1 text-white/30">|</span>
                    <span>Spare Parts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Book Now + Call */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onBookShop(activeShop)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#ea580c] hover:brightness-110 active:scale-95 text-white font-extrabold text-xs md:text-sm tracking-wider uppercase shadow-[0_8px_20px_rgba(255,121,0,0.4)] transition-all cursor-pointer text-center"
                >
                  Book Now
                </button>

                <button
                  type="button"
                  onClick={() => onCallShop(activeShop)}
                  className="w-12 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                  aria-label={`Call ${activeShop.shopName}`}
                >
                  <Phone size={18} className="text-[#FF7900]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
