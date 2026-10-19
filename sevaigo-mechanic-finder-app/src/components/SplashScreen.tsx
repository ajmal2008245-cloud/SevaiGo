"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onEnter: () => void;
  autoProceed?: boolean;
}

export default function SplashScreen({ onEnter, autoProceed = true }: SplashScreenProps) {
  // Animation phases: "start" -> "move-forward" -> "pop-settle" -> "fade-out"
  const [phase, setPhase] = useState<"start" | "forward" | "settle" | "fadeout">("start");
  const hasPlayedSound = useRef(false);

  // Synthesize clean mechanical click/pop sound using Web Audio API + local WAV fallback
  const playClickSound = () => {
    if (hasPlayedSound.current) return;
    hasPlayedSound.current = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Crisp mechanical click / pop frequency sweep
        osc.type = "sine";
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
        return;
      }
    } catch {
      // AudioContext unavailable or blocked
    }

    // Local fallback audio element
    try {
      const audio = new Audio("/sounds/click.wav");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    // 1. Start small (0ms) -> Move forward slightly (100ms)
    const t1 = setTimeout(() => {
      setPhase("forward");
    }, 100);

    // 2. Settle smoothly into position with pop effect + clean sound (450ms)
    const t2 = setTimeout(() => {
      setPhase("settle");
      playClickSound();
    }, 450);

    // 3. Smooth transition out (850ms)
    const t3 = setTimeout(() => {
      setPhase("fadeout");
    }, 850);

    // 4. Complete and navigate to login/home page immediately (1050ms)
    const t4 = setTimeout(() => {
      onEnter();
    }, 1050);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onEnter]);

  return (
    <div
      onClick={onEnter}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090C] text-white select-none cursor-pointer overflow-hidden transition-opacity duration-400 ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Radial ambient glow */}
      <div className="absolute w-[450px] h-[450px] bg-gradient-to-r from-[#FF7900]/25 to-[#ea580c]/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Animated Emblem & Logo Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Map Pin with Road & Wrench */}
        <div
          className="relative transition-all"
          style={{
            transform:
              phase === "start"
                ? "scale(0.5) translateY(30px)"
                : phase === "forward"
                ? "scale(1.15) translateY(-10px)"
                : "scale(1.0) translateY(0px)",
            opacity: phase === "start" ? 0 : 1,
            transitionDuration: phase === "forward" ? "500ms" : "350ms",
            transitionTimingFunction:
              phase === "settle"
                ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bouncy pop spring
                : "cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Logo Graphic */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 drop-shadow-[0_15px_35px_rgba(255,121,0,0.45)]">
            <Image
              src="/images/sevaigo-logo.png"
              alt="SevaiGo — Vehicle Breakdown? We're On The Way!"
              fill
              priority
              className="object-contain rounded-3xl"
            />
          </div>

          {/* Settle Glow Ring */}
          <div
            className={`absolute -inset-3 rounded-full bg-[#FF7900]/20 blur-xl transition-opacity duration-300 pointer-events-none ${
              phase === "settle" ? "opacity-100 scale-105" : "opacity-0 scale-95"
            }`}
          />
        </div>

        {/* Brand Tagline below emblem */}
        <div
          className="mt-4 transition-all duration-500"
          style={{
            opacity: phase === "settle" || phase === "fadeout" ? 1 : 0,
            transform: phase === "settle" || phase === "fadeout" ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wider text-[#A5ADB8] uppercase">
            <span>Roadside Rescue</span>
            <span className="text-[#FF7900]">•</span>
            <span>Verified Mechanics</span>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-28 h-1 rounded-full bg-white/10 mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF7900] to-[#FFB020] rounded-full transition-all duration-1000 ease-out"
            style={{ width: phase === "start" ? "10%" : phase === "forward" ? "65%" : "100%" }}
          />
        </div>

        <p className="text-[11px] text-[#A5ADB8]/70 mt-3 font-medium">Tap anywhere to enter</p>
      </div>
    </div>
  );
}
