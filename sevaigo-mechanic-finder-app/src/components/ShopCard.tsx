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
      className="shop-card group relative p-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#FF7900]/60 shadow-xs transition-all duration-300 cursor-pointer flex flex-col justify-between"
      onClick={() => onOpen(shop)}
      onKeyDown={(event) => { if (event.key === "Enter") onOpen(shop); }}
      tabIndex={0}
      role="button"
      aria-label={`${shop.shopName}, ${formatDistance(shop.distanceKm)} away. View details`}
    >
      <div className="flex gap-3.5">
        {/* Workshop Image */}
        <div className="w-20 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#E2E8F0] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={shop.photos[0] || "/images/workshop-1.jpg"}
            alt={`${shop.shopName} workshop`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
            {formatDistance(shop.distanceKm)}
          </span>
        </div>

        {/* Shop Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#FF7900] transition-colors truncate">
                {shop.shopName}
              </h3>
              {shop.isRegisteredOwner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                  <ShieldCheck size={11} strokeWidth={2.4} /> Verified Workshop
                </span>
              )}
            </div>

            <button
              type="button"
              className={`p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors shrink-0 cursor-pointer ${isSaved ? "text-[#FF7900]" : "text-[#94A3B8]"}`}
              onClick={(event) => { event.stopPropagation(); onFavorite(shop); }}
              aria-label={isSaved ? "Remove from saved shops" : "Save workshop"}
            >
              <Heart size={16} strokeWidth={2} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>

          <p className="text-xs text-[#64748B] flex items-center gap-1 truncate mb-2">
            <MapPin size={12} className="text-[#FF7900] shrink-0" />
            <span className="truncate">{shop.address}</span>
          </p>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="font-bold text-[#D97706] flex items-center gap-0.5">
              <Star size={12} fill="currentColor" /> {shop.rating.toFixed(1)}
            </span>
            <span>({shop.reviewCount})</span>
            <span className="text-[#CBD5E1]">•</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              status === "free" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : status === "busy" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {statusText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {shop.specializations.slice(0, 2).map((specialty) => (
              <span key={specialty} className="text-[10px] font-medium text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded">
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] mt-3">
        <span className="text-xs text-[#64748B]">
          Est. Charge: <strong className="text-[#0F172A]">₹{shop.priceMin} - ₹{shop.priceMax}</strong>
        </span>

        <div className="flex items-center gap-2">
          <a
            className="w-8 h-8 rounded-lg bg-[#F1F5F9] hover:bg-[#FF7900] hover:text-white text-[#475569] border border-[#E2E8F0] flex items-center justify-center transition-colors"
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
            className="px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
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
