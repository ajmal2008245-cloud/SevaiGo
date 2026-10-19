"use client";

import React from "react";
import MotorcycleScene from "./MotorcycleScene";

interface BikeBackgroundProps {
  scene?: "sunset" | "studio" | "garage" | "profile" | "interactive3d";
  opacity?: number;
  showOverlay?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function BikeBackground({
  scene = "studio",
  opacity = 0.08,
  showOverlay = true,
  children,
  className = "",
}: BikeBackgroundProps) {
  const imageMap = {
    sunset: "/images/splash-motorcycle.jpg",
    studio: "/images/login-motorcycle.jpg",
    garage: "/images/home-hero.jpg",
    profile: "/images/profile-banner.jpg",
    interactive3d: "/images/login-motorcycle.jpg",
  };

  return (
    <div className={`relative min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] overflow-x-hidden ${className}`}>
      {/* Background Layer with Clean Pure White */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#FFFFFF]">
        {scene === "interactive3d" ? (
          <div className="absolute inset-0 opacity-15">
            <MotorcycleScene
              interactive={false}
              autoRotate={true}
              cameraDistance={5.8}
              height="100%"
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out"
            style={{
              backgroundImage: `url('${imageMap[scene]}')`,
              opacity: 0.04,
              filter: "grayscale(100%)",
            }}
          />
        )}

        {/* Clean Light Subtle Glow */}
        {showOverlay && (
          <>
            <div className="absolute inset-0 bg-[#FFFFFF]/90 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FF7900]/10 via-transparent to-transparent pointer-events-none blur-3xl" />
            <div className="absolute bottom-10 left-0 w-[350px] h-[350px] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#FFB020]/8 via-transparent to-transparent pointer-events-none blur-3xl" />
          </>
        )}
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
