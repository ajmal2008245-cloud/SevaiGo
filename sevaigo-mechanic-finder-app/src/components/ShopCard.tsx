"use client";

import { ArrowUpRight, Heart, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { getTelUri } from "@/lib/phone";
import type { MechanicView } from "@/lib/mechanic-shared";
import { t, type Language } from "@/lib/copy";

type Props = {
  shop: MechanicView;
  language: Language;
  isSaved: boolean;
  onOpen: (shop: MechanicView) => void;
  onFavorite: (shop: MechanicView) => void;
  onCall: (shop: MechanicView) => void;
};

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function ShopCard({ shop, language, isSaved, onOpen, onFavorite, onCall }: Props) {
  const status = !shop.isOpen ? "closed" : shop.availabilityStatus === "busy" ? "busy" : "free";
  const statusText = status === "closed" ? t(language, "currentlyClosed") : status === "busy" ? t(language, "busyNow") : t(language, "freeNow");
  return (
    <article
      className="shop-card group relative p-3.5 rounded-2xl bg-[#121820] hover:bg-[#18202A] border border-white/10 hover:border-[#FF7900]/50 shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
      onClick={() => onOpen(shop)}
      onKeyDown={(event) => { if (event.key === "Enter") onOpen(shop); }}
      tabIndex={0}
      role="button"
      aria-label={`${shop.shopName}, ${formatDistance(shop.distanceKm)} away. View details`}
    >
      <div className="flex gap-3.5">
        {/* Workshop Image */}
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-[#0D1117] shrink-0 border border-white/10 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={shop.photos[0] || "/images/workshop-1.jpg"}
            alt={`${shop.shopName} workshop`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
            {formatDistance(shop.distanceKm)}
          </span>
        </div>

        {/* Shop Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white group-hover:text-[#FF7900] transition-colors truncate">
                {shop.shopName}
              </h3>
              {shop.isRegisteredOwner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#10B981]/15 px-1.5 py-0.5 rounded border border-[#10B981]/25 mt-0.5">
                  <ShieldCheck size={11} strokeWidth={2.4} /> Verified Workshop
                </span>
              )}
            </div>

            <button
              type="button"
              className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0 ${isSaved ? "text-[#FF7900]" : "text-[#A5ADB8]"}`}
              onClick={(event) => { event.stopPropagation(); onFavorite(shop); }}
              aria-label={isSaved ? "Remove from saved shops" : "Save workshop"}
            >
              <Heart size={16} strokeWidth={2} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>

          <p className="text-xs text-[#A5ADB8] flex items-center gap-1 truncate mb-2">
            <MapPin size={12} className="text-[#FF7900] shrink-0" />
            <span className="truncate">{shop.address}</span>
          </p>

          <div className="flex items-center gap-2 text-xs text-[#A5ADB8]">
            <span className="font-bold text-[#FFB020] flex items-center gap-0.5">
              <Star size={12} fill="currentColor" /> {shop.rating.toFixed(1)}
            </span>
            <span>({shop.reviewCount})</span>
            <span className="text-white/20">•</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              status === "free" ? "bg-emerald-500/15 text-emerald-400" : status === "busy" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
            }`}>
              {statusText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {shop.specializations.slice(0, 2).map((specialty) => (
              <span key={specialty} className="text-[10px] font-medium text-[#A5ADB8] bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
        <span className="text-xs text-[#A5ADB8]">
          Est. Charge: <strong className="text-white">₹{shop.priceMin} - ₹{shop.priceMax}</strong>
        </span>

        <div className="flex items-center gap-2">
          <a
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#FF7900] hover:text-white text-[#A5ADB8] flex items-center justify-center transition-colors"
            href={getTelUri(shop.phone) || "#"}
            aria-label={`Call ${shop.shopName}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCall(shop);
            }}
          >
            <Phone size={14} />
          </a>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold transition-all shadow-[0_2px_10px_rgba(255,121,0,0.3)] flex items-center gap-1"
            onClick={(event) => { event.stopPropagation(); onOpen(shop); }}
          >
            <span>Details</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}
