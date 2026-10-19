"use client";

import React, { useState } from "react";
import { ArrowRight, Sparkles, Wrench, Shield, Zap } from "lucide-react";
import MotorcycleScene from "./3d/MotorcycleScene";

interface CinematicHeroProps {
  onBookNow: () => void;
  onExplore: () => void;
}

export default function CinematicHero({ onBookNow, onExplore }: CinematicHeroProps) {
  const [view3D, setView3D] = useState(false);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] shadow-sm mb-6 transition-all duration-300">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#FF7900]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[200px] h-[200px] bg-[#FFB020]/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-5 md:p-7 gap-4">
        {/* Left Copy & CTA */}
        <div className="flex-1 text-left w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/10 border border-[#FF7900]/25 text-[#FF7900] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={13} />
            <span>Premium Bike Care</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] leading-tight tracking-tight mb-2 font-['Manrope']">
            Service Your Bike Today!
          </h2>
          <p className="text-[#64748B] text-sm md:text-base leading-relaxed mb-5 max-w-sm">
            Better performance, longer rides. Certified mechanics at your doorstep or nearby garage.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBookNow}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#FF7900] hover:bg-[#ea580c] active:scale-95 text-white font-bold text-sm tracking-wide shadow-md shadow-[#FF7900]/20 transition-all duration-200 cursor-pointer"
            >
              <span>Book Now</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => setView3D(!view3D)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] tracking-wide shadow-xs transition-all duration-200 cursor-pointer"
              title="Toggle interactive 3D camera turntable"
            >
              <Zap size={14} className="text-[#FF7900]" />
              <span>{view3D ? "Photo Mode" : "Interactive 3D"}</span>
            </button>
          </div>
        </div>

        {/* Right Motorcycle Showcase */}
        <div className="w-full md:w-5/12 h-[210px] md:h-[240px] relative rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] flex items-center justify-center">
          {view3D ? (
            <div className="w-full h-full">
              <MotorcycleScene
                interactive={true}
                autoRotate={true}
                cameraDistance={4.8}
                height="100%"
              />
            </div>
          ) : (
            <div className="relative w-full h-full group cursor-pointer" onClick={() => setView3D(true)}>
              <img
                src="/images/home-hero.jpg"
                alt="SevaiGo Superbike Hero"
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-md bg-black/70 border border-white/15 text-[11px] font-semibold text-white/90 backdrop-blur-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF7900] animate-pulse" />
                Tap for 3D Turntable
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Micro-features strip */}
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#64748B]">
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-[#FF7900]" />
          <span>OEM Genuine Parts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wrench size={13} className="text-[#FF7900]" />
          <span>60-Min Roadside Pickup</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#FF7900]" />
          <span>Transparent Pricing</span>
        </div>
      </div>
    </div>
  );
}
