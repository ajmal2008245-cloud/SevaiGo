"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Maximize2,
  Minimize2,
  Smartphone,
  Sparkles,
  Wifi,
  Battery,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface DeviceShellProps {
  children: ReactNode;
}

export default function DeviceShell({ children }: DeviceShellProps) {
  const [time, setTime] = useState("9:41");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batteryPct, setBatteryPct] = useState(94);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const formatted = `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
      setTime(formatted);
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);

    // Optional battery level check
    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as any).getBattery?.().then((battery: any) => {
        if (battery && typeof battery.level === "number") {
          setBatteryPct(Math.round(battery.level * 100));
        }
      }).catch(() => {});
    }

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`sevaigo-viewport-wrapper ${
        isFullscreen ? "desktop-force-fullscreen" : ""
      }`}
    >
      {/* 1. Desktop Ambient Background & Navigation Bar (Visible only on Desktop/Laptop > 768px) */}
      <div className="desktop-ambient-layer" aria-hidden="true">
        {/* Ambient Glows */}
        <div className="desktop-glow desktop-glow-orange" />
        <div className="desktop-glow desktop-glow-blue" />
        <div className="desktop-grid-pattern" />

        {/* Desktop Top Header Bar */}
        <header className="desktop-top-header">
          {/* Brand Info */}
          <div className="desktop-brand">
            <div className="desktop-brand-logo">
              <Image
                src="/images/sevaigo-logo.png"
                alt="SevaiGo Logo"
                width={30}
                height={30}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="desktop-brand-title">
                Sevai<span>Go</span>
              </div>
              <div className="desktop-brand-subtitle">
                Roadside Assistance • Partner Network
              </div>
            </div>
          </div>

          {/* Center Device Specs Pill */}
          <div className="desktop-device-badge">
            <span className="live-pulse-dot" />
            <Smartphone size={14} className="text-[#FF7900]" />
            <span className="font-bold text-slate-200">iPhone 15 Pro</span>
            <span className="text-slate-500 font-normal">|</span>
            <span className="text-slate-400 text-xs">iOS 18 Preview</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF7900]/15 text-[#FF7900] font-bold">
              393 × 852
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="desktop-actions">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="desktop-control-btn"
              title={isFullscreen ? "Switch to iPhone Mockup View" : "Expand to Fullscreen View"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={13} className="text-[#FF7900]" />
                  <span>Phone Frame</span>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Desktop Bottom Footer Notice */}
        <footer className="desktop-bottom-footer">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Sparkles size={13} className="text-[#FF7900]" />
            <span>Interactive Mobile Simulator • Click, type, test GPS and live tracking directly</span>
          </div>
        </footer>
      </div>

      {/* 2. Device Chassis & Realistic Black Titanium Frame */}
      <div className="device-chassis-container">
        {/* Physical Hardware Buttons (Left side: Action Button + Volume Up/Down) */}
        <div className="hw-button hw-action-btn" aria-hidden="true" />
        <div className="hw-button hw-vol-up" aria-hidden="true" />
        <div className="hw-button hw-vol-down" aria-hidden="true" />

        {/* Physical Hardware Buttons (Right side: Power / Siri Button) */}
        <div className="hw-button hw-power-btn" aria-hidden="true" />

        {/* Main Phone Body */}
        <div className="device-phone-frame">
          {/* Subtle Diagonal Glass Sheen Reflection */}
          <div className="screen-glass-sheen" aria-hidden="true" />

          {/* Screen Viewport: Acts as Containing Block for All Fixed Position Overlays */}
          <div className="device-screen-viewport" id="sevaigo-app-viewport">
            {/* iOS Dynamic Island & Status Bar (Hidden on actual mobile phones) */}
            <div className="device-status-bar" aria-hidden="true">
              {/* Left: Clock */}
              <div className="status-time">
                {isMounted ? time : "9:41"}
              </div>

              {/* Center: Dynamic Island */}
              <div className="dynamic-island">
                <div className="island-pill">
                  {/* Front Camera Lens Specular Glint */}
                  <div className="island-lens" />
                  {/* TrueDepth Sensor Dot */}
                  <div className="island-sensor" />
                </div>
              </div>

              {/* Right: Signal, 5G/Wi-Fi, Battery */}
              <div className="status-icons">
                {/* Cellular 4-bars SVG */}
                <svg
                  className="w-4 h-3 text-[#0F172A]"
                  viewBox="0 0 17 12"
                  fill="currentColor"
                >
                  <rect x="0" y="9" width="3" height="3" rx="0.5" />
                  <rect x="4.5" y="6" width="3" height="6" rx="0.5" />
                  <rect x="9" y="3" width="3" height="9" rx="0.5" />
                  <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
                </svg>

                {/* 5G / Wi-Fi */}
                <Wifi size={13} strokeWidth={2.5} className="text-[#0F172A]" />

                {/* Battery Pill */}
                <div className="battery-capsule">
                  <div
                    className="battery-level"
                    style={{ width: `${Math.min(100, Math.max(15, batteryPct))}%` }}
                  />
                  <div className="battery-terminal" />
                </div>
              </div>
            </div>

            {/* The Actual SevaiGo Application Content */}
            <div className="device-screen-content">
              {children}
            </div>

            {/* iOS Home Indicator Bar (Hidden on actual mobile phones) */}
            <div className="device-home-indicator" aria-hidden="true">
              <div className="home-bar" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
