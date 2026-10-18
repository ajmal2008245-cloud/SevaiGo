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
  opacity = 0.5,
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
    <div className={`relative min-h-screen w-full bg-[#07090C] text-white overflow-x-hidden ${className}`}>
      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {scene === "interactive3d" ? (
          <div className="absolute inset-0 opacity-40">
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
              opacity: opacity,
              filter: "brightness(0.7) contrast(1.15)",
            }}
          />
        )}

        {/* Cinematic Vignette & Ambient Glow */}
        {showOverlay && (
          <>
            {/* Deep Dark Automotive Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#07090C]/90 via-[#07090C]/75 to-[#07090C] pointer-events-none" />

            {/* Subtle Racing Orange Corner Glow */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FF7900]/15 via-transparent to-transparent pointer-events-none blur-3xl" />
            <div className="absolute bottom-10 left-0 w-[350px] h-[350px] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#FF7900]/10 via-transparent to-transparent pointer-events-none blur-3xl" />
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
