"use client";

import React from "react";
import {
  Calendar,
  ChevronRight,
  HelpCircle,
  LogOut,
  Settings,
  ShieldCheck,
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
  const userName =
    user?.name ||
    (user?.phone
      ? isMechanic
        ? `Mechanic ${user.phone.slice(-4)}`
        : `Rider ${user.phone.slice(-4)}`
      : "SevaiGo Member");
  const userEmail =
    user?.email && !user.email.includes("@sevaigo.local")
      ? user.email
      : user?.phone
      ? `+91 ${user.phone.replace(/\D/g, "")}`
      : "Verified Mobile Account";

  const initials =
    userName
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
          title: "Partner Helpline & Support",
          icon: HelpCircle,
          action: onOpenHelp,
        },
      ]
    : [
        {
          id: "rescue",
          title: "Roadside Breakdown Assistance",
          icon: Wrench,
          action: () => onNavigate("home"),
          badge: "Live",
        },
        {
          id: "bookings",
          title: "My Service Bookings",
          icon: Calendar,
          action: () => onNavigate("track"),
        },
        {
          id: "offers",
          title: "Offers & Coupons",
          icon: Tag,
          action: onOpenOffers,
          badge: "New",
        },
        {
          id: "help",
          title: "Help & Support",
          icon: HelpCircle,
          action: onOpenHelp,
        },
      ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-[#172033] pb-28 font-['DM_Sans',sans-serif]">
      {/* User Header Profile Card */}
      <div className="p-5 rounded-2xl bg-white border border-[#D5DEE5] shadow-xs mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2F6B73] via-[#3B82F6] to-[#1E484E] p-0.5 shadow-xs">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <span className="text-xl font-black text-[#2F6B73] tracking-wide font-['Manrope']">{initials}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2F6B73] text-white flex items-center justify-center text-[10px] shadow">
              {isMechanic ? <Wrench size={12} /> : <ShieldCheck size={12} />}
            </div>
          </div>

          <div>
            <h1 className="text-lg font-bold text-[#172033] leading-tight">{userName}</h1>
            <p className="text-xs text-[#64748B] mt-0.5">{userEmail}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] text-[10px] font-bold">
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
          className="p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-red-50 text-[#64748B] hover:text-red-500 border border-[#D5DEE5] hover:border-red-200 transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Menu List */}
      <div className="rounded-2xl bg-white border border-[#D5DEE5] overflow-hidden divide-y divide-[#D5DEE5] mb-6 shadow-xs">
        {menuItems.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] active:bg-[#F4FAFC] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] flex items-center justify-center text-[#2F6B73]">
                  <IconComp size={18} />
                </div>
                <span className="text-sm font-semibold text-[#172033]">{item.title}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF4FF] text-[#2F6B73] font-bold border border-[#BFDBFE]">
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
        SevaiGo v2.5 • Verified Roadside Assistance Network
      </div>
    </div>
  );
}
