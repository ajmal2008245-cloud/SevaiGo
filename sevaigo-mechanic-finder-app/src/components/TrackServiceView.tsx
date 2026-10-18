"use client";

import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Shield,
  Wrench,
} from "lucide-react";

interface TrackServiceViewProps {
  onBack: () => void;
  onLiveTracking: () => void;
  booking?: any;
  onCancel?: () => void;
}

export default function TrackServiceView({
  onBack,
  onLiveTracking,
  booking,
  onCancel,
}: TrackServiceViewProps) {
  const serviceId = booking?.id || booking?.referenceId || "SG#45872";
  const bikeName = booking?.bike || "Yamaha FZ";
  const dateFormatted = booking?.date
    ? `${booking.date}, 10:15 AM`
    : "26 Oct 2026, 10:15 AM";
  const mechanicName = booking?.mechanic?.name || "Ravi Kumar";
  const mechanicPhone = booking?.mechanic?.phone || "+91 98765 43210";

  const timelineSteps = [
    {
      id: "received",
      title: "Bike Received",
      time: "10:32 AM",
      desc: "Workshop inspection initiated and check-in logged",
      status: "completed",
    },
    {
      id: "diagnosis",
      title: "Diagnosis",
      time: "11:10 AM",
      desc: "Multi-point health check completed. Spark plugs & brake fluid verified",
      status: "completed",
    },
    {
      id: "progress",
      title: "Service In Progress",
      time: "Current Stage",
      desc: "Oil flushing, filter replacement & chain ultrasonic lubrication underway",
      status: "current",
    },
    {
      id: "ready",
      title: "Ready for Pickup",
      time: "Est. 12:45 PM",
      desc: "Test ride and final exterior polish inspection",
      status: "upcoming",
    },
    {
      id: "completed",
      title: "Completed",
      time: "Pending Delivery",
      desc: "Handover with digital invoice & 15-day service guarantee",
      status: "upcoming",
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
          Track Service
        </h1>

        <button
          type="button"
          onClick={onLiveTracking}
          className="text-xs font-bold text-[#FF7900] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Navigation size={14} />
          <span>Live Map</span>
        </button>
      </div>

      {/* Service ID Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121820] to-[#0D1117] border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.5)] mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white tracking-wide">
            Service ID: <span className="text-[#FF7900]">{serviceId}</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#FF7900]/15 border border-[#FF7900]/30 text-[#FF7900] text-xs font-bold">
            In Progress
          </span>
        </div>

        <div className="text-xs text-[#A5ADB8] space-y-1">
          <div>
            Bike: <span className="font-semibold text-white">{bikeName}</span>
          </div>
          <div>
            Booked on: <span className="font-semibold text-white">{dateFormatted}</span>
          </div>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="p-5 rounded-2xl bg-[#0D1117] border border-white/10 shadow-lg mb-6">
        <h2 className="text-sm font-bold text-white mb-5 tracking-wide flex items-center gap-2">
          <Wrench size={16} className="text-[#FF7900]" />
          <span>Service Timeline</span>
        </h2>

        <div className="relative pl-7 space-y-6">
          {/* Vertical line connector */}
          <div className="absolute left-[11px] top-2 bottom-3 w-[2px] bg-gradient-to-b from-[#FF7900] via-[#FF7900] to-white/10" />

          {timelineSteps.map((step) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";

            return (
              <div key={step.id} className="relative">
                {/* Node icon */}
                <div
                  className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-[#FF7900] text-white shadow-[0_0_12px_rgba(255,121,0,0.5)]"
                      : isCurrent
                      ? "bg-[#07090C] border-2 border-[#FF7900] text-[#FF7900] ring-4 ring-[#FF7900]/20 shadow-[0_0_16px_rgba(255,121,0,0.6)]"
                      : "bg-[#121820] border border-white/20 text-[#A5ADB8]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[#FF7900] animate-ping" />
                  ) : (
                    <Clock size={12} />
                  )}
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm font-bold ${
                        isCurrent
                          ? "text-[#FF7900]"
                          : isCompleted
                          ? "text-white"
                          : "text-[#A5ADB8]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#A5ADB8]">
                      {step.time}
                    </span>
                  </div>
                  <p className="text-xs text-[#A5ADB8]/80 mt-0.5 leading-snug">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assigned Mechanic Card */}
      <div className="p-4 rounded-2xl bg-[#121820] border border-white/10 flex items-center justify-between shadow-md mb-6">
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
            <div className="text-[10px] font-bold text-[#FF7900] uppercase tracking-wider">
              Assigned Mechanic
            </div>
            <div className="text-sm font-bold text-white">{mechanicName}</div>
            <div className="text-xs text-[#A5ADB8]">{mechanicPhone}</div>
          </div>
        </div>

        <a
          href={`tel:${mechanicPhone.replace(/\D/g, "")}`}
          className="w-10 h-10 rounded-full bg-[#FF7900]/15 hover:bg-[#FF7900] text-[#FF7900] hover:text-white border border-[#FF7900]/30 flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Call Mechanic"
        >
          <Phone size={17} />
        </a>
      </div>

      {/* CTA Button to Live Tracking Map */}
      <button
        type="button"
        onClick={onLiveTracking}
        className="w-full py-4 rounded-full bg-gradient-to-r from-[#FF7900] to-[#ea580c] hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(255,121,0,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Navigation size={18} />
        <span>Open Live Tracking Map</span>
      </button>

      {onCancel && booking?.status !== "Completed" && booking?.status !== "completed" && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-3 py-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-bold transition-all cursor-pointer"
        >
          Cancel Service Request
        </button>
      )}
    </div>
  );
}
