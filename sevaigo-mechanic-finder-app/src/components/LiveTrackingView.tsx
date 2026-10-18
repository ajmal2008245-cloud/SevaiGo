"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Bike,
  Clock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";

interface LiveTrackingViewProps {
  onBack: () => void;
  booking?: any;
  onCancel?: () => void;
}

export default function LiveTrackingView({ onBack, booking, onCancel }: LiveTrackingViewProps) {
  const [activeTab, setActiveTab] = useState<"map" | "telemetry">("map");
  const mechanicName = booking?.mechanic?.name || "Ravi Kumar";
  const mechanicPhone = booking?.mechanic?.phone || "+91 98765 43210";
  const [messageOpen, setMessageOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState([
    { sender: "mechanic", text: "Hello! We are currently working on your bike's brake assembly.", time: "11:15 AM" },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatLog((prev) => [
      ...prev,
      { sender: "user", text: chatMessage.trim(), time: "Just now" },
    ]);
    setChatMessage("");
    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        { sender: "mechanic", text: "Understood! I will do a thorough inspection of that.", time: "Just now" },
      ]);
    }, 1200);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28 relative">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
          Live Tracking
        </h1>

        <div className="w-10" />
      </div>

      {/* Top Status Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#121820] via-[#1a232f] to-[#121820] border border-white/10 shadow-lg flex items-center gap-3.5 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center shrink-0 border border-[#FF7900]/30 shadow-[0_0_15px_rgba(255,121,0,0.3)]">
          <Wrench size={22} className="animate-spin" style={{ animationDuration: "12s" }} />
        </div>

        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            {booking?.status ? `Status: ${booking.status}` : "Rescue assistance in progress"}
          </h2>
          <p className="text-xs text-[#A5ADB8] mt-0.5 flex items-center gap-1.5">
            <Clock size={13} className="text-[#FF7900]" />
            {booking?.etaMinutes ? (
              <span>Calculated Live ETA: <strong className="text-white">~{booking.etaMinutes} mins</strong></span>
            ) : (
              <span>Mechanic en-route / preparing tools</span>
            )}
          </p>
        </div>
      </div>

      {/* Stylized Dark Live Map View */}
      <div className="relative w-full h-[360px] md:h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-[#0B0F15] shadow-2xl mb-4">
        {/* Dark Map Canvas simulation with streets, route line and pulsating markers */}
        <div className="absolute inset-0 bg-[#070A0E] opacity-95">
          {/* Subtle street grid lines */}
          <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2a3545" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Glowing Animated Route Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 90 280 L 160 210 L 220 225 L 300 130 L 330 90"
              fill="none"
              stroke="#FF7900"
              strokeWidth="4"
              strokeDasharray="6 4"
              className="animate-pulse"
              style={{ filter: "drop-shadow(0 0 8px rgba(255,121,0,0.8))" }}
            />
          </svg>

          {/* Garage / Workshop Pin (Orange) */}
          <div className="absolute top-[80px] right-[70px] flex flex-col items-center">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#FF7900] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,121,0,0.8)] z-10 relative">
                <Wrench size={17} />
              </div>
              <div className="absolute -inset-2 rounded-full bg-[#FF7900]/30 animate-ping" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-bold text-white whitespace-nowrap backdrop-blur-sm">
              Rider's Garage
            </span>
          </div>

          {/* Active Motorcycle Position Marker */}
          <div className="absolute top-[195px] left-[145px] flex flex-col items-center">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#121820] border-2 border-[#FF7900] text-[#FF7900] flex items-center justify-center shadow-[0_0_25px_rgba(255,121,0,0.9)] z-10 relative">
                <Bike size={20} />
              </div>
              <div className="absolute -inset-2.5 rounded-full bg-[#FF7900]/25 animate-ping" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded bg-[#FF7900] text-[9px] font-black text-white uppercase tracking-wider shadow">
              Yamaha FZ (In Service)
            </span>
          </div>

          {/* User Location Marker (Blue) */}
          <div className="absolute bottom-[65px] left-[75px] flex flex-col items-center">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10 relative">
                <MapPin size={15} />
              </div>
              <div className="absolute -inset-2 rounded-full bg-[#3B82F6]/30 animate-pulse" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-bold text-white whitespace-nowrap backdrop-blur-sm">
              Your Location
            </span>
          </div>
        </div>

        {/* Floating Map Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={() => alert("Re-centered on active service location")}
            className="w-9 h-9 rounded-lg bg-[#121820]/90 border border-white/15 text-white flex items-center justify-center backdrop-blur-sm shadow-md hover:bg-[#121820] cursor-pointer"
            title="Recenter"
          >
            <Navigation size={16} className="text-[#FF7900]" />
          </button>
        </div>

        {/* Live Traffic / GPS indicator badge */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 border border-white/15 backdrop-blur-sm flex items-center gap-2 text-[11px] font-semibold text-white z-20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {booking?.mechanicLat && booking?.mechanicLng
              ? `Mechanic Live: ${booking.mechanicLat.toFixed(4)}, ${booking.mechanicLng.toFixed(4)}`
              : "Live GPS Telemetry"}
          </span>
        </div>
      </div>

      {/* Mechanic Card with Contact Actions */}
      <div className="p-4 rounded-2xl bg-[#121820] border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF7900] to-[#FFB020] p-0.5 shadow-md">
              <div className="w-full h-full rounded-full bg-[#121820] flex items-center justify-center overflow-hidden">
                <img
                  src="/images/owner-1.jpg"
                  alt={mechanicName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
                <span className="text-sm font-bold text-white">RK</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-white">{mechanicName}</div>
              <div className="text-xs text-[#A5ADB8]">Mechanic • Live at Garage</div>
            </div>
          </div>

          <a
            href={`tel:${mechanicPhone.replace(/\D/g, "")}`}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#FF7900] text-white border border-white/10 hover:border-[#FF7900] flex items-center justify-center transition-all cursor-pointer shadow-md"
            title="Call Mechanic"
          >
            <Phone size={17} />
          </a>
        </div>

        {/* Message / Chat Toggle Button */}
        <button
          type="button"
          onClick={() => setMessageOpen(!messageOpen)}
          className="w-full py-3.5 rounded-full bg-[#FF7900] hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(255,121,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <MessageSquare size={17} />
          <span>{messageOpen ? "Close Direct Chat" : "Message Mechanic"}</span>
        </button>

        {/* Inline Live Chat Drawer */}
        {messageOpen && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-200">
            <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1 text-xs">
              {chatLog.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl max-w-[80%] ${
                    c.sender === "user"
                      ? "ml-auto bg-[#FF7900] text-white rounded-br-none"
                      : "mr-auto bg-[#0D1117] text-[#A5ADB8] border border-white/10 rounded-bl-none"
                  }`}
                >
                  <p>{c.text}</p>
                  <span className="text-[9px] opacity-70 block text-right mt-1">
                    {c.time}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about parts, delivery time..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0D1117] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF7900]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#FF7900] text-white font-bold text-xs hover:bg-[#ea580c] transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {onCancel && booking?.status !== "Completed" && booking?.status !== "completed" && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 py-3.5 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          Cancel Rescue Request
        </button>
      )}
    </div>
  );
}
