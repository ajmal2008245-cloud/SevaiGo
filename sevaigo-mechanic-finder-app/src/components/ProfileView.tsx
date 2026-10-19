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
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  User,
  Wrench,
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
  const isMechanic = user?.role === "mechanic";
  const userName = user?.name || (user?.phone ? (isMechanic ? `Mechanic ${user.phone.slice(-4)}` : `Rider ${user.phone.slice(-4)}`) : "SevaiGo Member");
  const userEmail = user?.email && !user.email.includes("@sevaigo.local") ? user.email : (user?.phone ? `+91 ${user.phone.replace(/\D/g, "")}` : "Verified Mobile Account");

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || (isMechanic ? "M" : "C");

  // Role-specific menu items
  const menuItems = isMechanic
    ? [
        {
          id: "workshop",
          title: "Mechanic Dashboard & Garage",
          icon: Store,
          action: () => onNavigate("register-shop"),
          badge: "Active",
        },
        {
          id: "help",
          title: "Mechanic Partner Support",
          icon: HelpCircle,
          action: onOpenHelp,
        },
        {
          id: "settings",
          title: "Garage Settings",
          icon: Settings,
          action: () => alert("Garage profile and notifications are active."),
        },
      ]
    : [
        {
          id: "bookings",
          title: "My Service Bookings",
          icon: Calendar,
          action: () => onNavigate("activity"),
        },
        {
          id: "garages",
          title: "Nearby Certified Garages",
          icon: Store,
          action: () => onNavigate("garages"),
        },
        {
          id: "bikes",
          title: "My Vehicles",
          icon: Bike,
          action: () => onNavigate("vehicles"),
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
          action: () => alert("Notification settings saved."),
        },
      ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-[#0F172A] pb-28 font-['DM_Sans',sans-serif]">
      {/* User Header Profile Card */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF7900] via-[#FFB020] to-[#ea580c] p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-[#FFFFFF] flex items-center justify-center overflow-hidden">
                <span className="text-xl font-black text-[#FF7900] tracking-wide font-['Manrope']">{initials}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center text-[10px] shadow">
              {isMechanic ? <Wrench size={12} /> : <ShieldCheck size={12} />}
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">{userName}</h1>
            <p className="text-xs text-[#64748B] mt-0.5">{userEmail}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF7900]/10 border border-[#FF7900]/25 text-[#FF7900] text-[10px] font-bold">
              {isMechanic ? (
                <>
                  <Wrench size={11} />
                  <span>Verified Mechanic Partner</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={11} />
                  <span>Verified Customer</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-red-50 text-[#64748B] hover:text-red-500 border border-[#E2E8F0] hover:border-red-200 transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Menu List */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0] mb-6 shadow-sm">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#FF7900]">
                  <IconComp size={18} />
                </div>
                <span className="text-sm font-semibold text-[#0F172A]">{item.title}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF7900]/10 text-[#FF7900] font-bold border border-[#FF7900]/20">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-[#94A3B8]" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-[#94A3B8]">
        SevaiGo v2.4 • Supabase Verified • Clean White Edition
      </div>
    </div>
  );
}
