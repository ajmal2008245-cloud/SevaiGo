"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Bike, ShieldCheck, Sparkles, Wrench } from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
  autoProceed?: boolean;
}

export default function SplashScreen({ onEnter, autoProceed = false }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoProceed) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onEnter, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [autoProceed, onEnter]);

  return (
    <div className="relative min-h-screen w-full bg-[#07090C] text-white overflow-hidden flex flex-col justify-between p-6 select-none font-['DM_Sans',sans-serif]">
      {/* Background Cinematic Sunset Road Image */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.78] contrast-[1.12] transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/images/splash-motorcycle.jpg')" }}
      />

      {/* Atmospheric Overlays & Soft Radial Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090C] via-[#07090C]/40 to-[#07090C]/85 pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-[#FF7900]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 right-0 w-[300px] h-[300px] bg-[#FFB020]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Section: Logo & Tagline */}
      <div className="relative z-10 pt-10 text-center flex flex-col items-center">
        {/* SevaiGo Gear Emblem */}
        <div className="relative mb-3 group">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF7900] via-[#FFB020] to-[#ea580c] p-0.5 shadow-[0_10px_30px_rgba(255,121,0,0.5)]">
            <div className="w-full h-full rounded-[14px] bg-[#0D1117] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF7900]/25 to-transparent" />
              {/* Gear bike logo */}
              <div className="relative flex items-center justify-center">
                <Bike size={38} className="text-[#FF7900]" strokeWidth={2.4} />
              </div>
            </div>
          </div>
          {/* Subtle spinning glow ring */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FF7900] to-[#FFB020] opacity-40 blur-sm -z-10 animate-pulse" />
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white font-['Manrope'] mb-1">
          Sevai<span className="text-[#FF7900]">Go</span>
        </h1>

        {/* Primary Tagline */}
        <p className="text-sm md:text-base font-semibold tracking-wider text-[#A5ADB8] uppercase">
          Your Bike, Our Priority.
        </p>
      </div>

      {/* Center Atmospheric Spacer */}
      <div className="relative z-10 my-auto text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg text-xs font-medium text-white/90">
          <Sparkles size={14} className="text-[#FF7900]" />
          <span>Every Ride Deserves The Best</span>
        </div>
      </div>

      {/* Bottom Section: Slogans & Enter CTA */}
      <div className="relative z-10 max-w-sm w-full mx-auto pb-6 text-center flex flex-col items-center gap-5">
        {/* Quick Highlights */}
        <p className="text-xs font-semibold tracking-wider text-[#A5ADB8]/90">
          Quick Service <span className="text-[#FF7900] mx-1">•</span> Trusted Mechanics <span className="text-[#FF7900] mx-1">•</span> Always Nearby
        </p>

        {/* Interactive Enter App Button */}
        <button
          type="button"
          onClick={onEnter}
          className="w-full max-w-xs py-4 px-6 rounded-full bg-gradient-to-r from-[#FF7900] to-[#ea580c] hover:brightness-110 active:scale-95 text-white font-extrabold text-sm tracking-wider uppercase shadow-[0_10px_30px_rgba(255,121,0,0.45)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Get Started</span>
          <ArrowRight size={18} />
        </button>

        {/* Minimalist Progress Indicator */}
        <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#FF7900] transition-all duration-300 rounded-full"
            style={{ width: `${autoProceed ? progress : 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
