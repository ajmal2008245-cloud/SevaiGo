"use client";

import React from "react";
import {
  Bell,
  Bike,
  Calendar,
  ChevronRight,
  CreditCard,
  Crown,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import type { PublicUser } from "@/lib/auth";

interface ProfileViewProps {
  user: PublicUser | null;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onOpenOffers: () => void;
  onOpenHelp: () => void;
}

export default function ProfileView({
  user,
  onNavigate,
  onLogout,
  onOpenOffers,
  onOpenHelp,
}: ProfileViewProps) {
  const userName = user?.name || (user?.phone ? `Rider ${user.phone.slice(-4)}` : "SevaiGo Rider");
  const userEmail = user?.email && !user.email.includes("@sevaigo.local") ? user.email : (user?.phone ? `+91 ${user.phone.replace(/\D/g, "")}` : "Verified Mobile Account");
  const userPhone = user?.phone ? (user.phone.startsWith("+91") ? user.phone : `+91 ${user.phone.replace(/\D/g, "")}`) : "Signed in via OTP";

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "R";

  const menuItems = [
    {
      id: "bookings",
      title: "My Bookings",
      icon: Calendar,
      action: () => onNavigate("activity"),
    },
    {
      id: "bikes",
      title: "My Bikes",
      icon: Bike,
      action: () => onNavigate("vehicles"),
    },
    {
      id: "payments",
      title: "Payment Methods",
      icon: CreditCard,
      action: () => alert("UPI & Cards are securely managed upon service checkout."),
    },
    {
      id: "offers",
      title: "Offers & Coupons",
      icon: Tag,
      action: onOpenOffers,
      badge: "3 New",
    },
    {
      id: "help",
      title: "Help & Support",
      icon: HelpCircle,
      action: onOpenHelp,
    },
    {
      id: "settings",
      title: "Settings",
      icon: Settings,
      action: () => alert("Notification and theme settings are saved locally."),
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
      {/* User Header Profile Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121820] to-[#0D1117] border border-white/10 shadow-lg mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF7900] via-[#FFB020] to-[#ea580c] p-0.5 shadow-lg">
              <div className="w-full h-full rounded-full bg-[#121820] flex items-center justify-center overflow-hidden">
                <span className="text-xl font-black text-[#FF7900] tracking-wide font-['Manrope']">{initials}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-[10px] shadow">
              <Crown size={12} />
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{userName}</h1>
            <p className="text-xs text-[#A5ADB8] mt-0.5">{userEmail}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/30 text-[#FF7900] text-[10px] font-bold">
              <Crown size={11} />
              <span>Premium Rider</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-[#A5ADB8] hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Menu List */}
      <div className="rounded-2xl bg-[#0D1117] border border-white/10 overflow-hidden divide-y divide-white/5 mb-6 shadow-md">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#121820] border border-white/10 flex items-center justify-center text-[#FF7900]">
                  <IconComp size={18} />
                </div>
                <span className="text-sm font-semibold text-white">{item.title}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF7900]/15 text-[#FF7900] font-bold">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-[#A5ADB8]" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Ride Safe Ride Better Promo Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-black via-[#0D1117] to-black p-5 shadow-xl">
        <div className="absolute inset-0 opacity-40">
          <img
            src="/images/profile-banner.jpg"
            alt="Ride Safe Superbike"
            className="w-full h-full object-cover object-center filter brightness-75"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090C] via-[#07090C]/80 to-transparent" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7900] uppercase tracking-wider mb-1">
              <Crown size={14} />
              <span>Ride Safe, Ride Better</span>
            </div>
            <p className="text-xs text-[#A5ADB8] max-w-xs leading-relaxed">
              Every ride deserves certified care. Book routine servicing and save 20% on all spare parts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
