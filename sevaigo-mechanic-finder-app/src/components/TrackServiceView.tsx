"use client";

import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";

interface TrackServiceViewProps {
  booking: any;
  onBack: () => void;
  onLiveTracking: () => void;
  onCancel?: () => void;
}

export default function TrackServiceView({
  booking,
  onBack,
  onLiveTracking,
  onCancel,
}: TrackServiceViewProps) {
  const serviceId = booking?.referenceId || booking?.id || "SRV-982341";
  const garageName = booking?.garage || "Ravi Auto Works";
  const dateFormatted = booking?.date || "Today, 10:30 AM";
  const bikeName = booking?.bike || "Royal Enfield Classic 350";
  const mechanicName = booking?.mechanic?.name || "Ravi Kumar";
  const mechanicPhone = booking?.mechanic?.phone || "+91 98765 43210";

  // Dynamic status mapper
  const rawStatus = (booking?.status || "Requested").toLowerCase();
  let currentStepIndex = 1;
  if (rawStatus === "requested" || rawStatus === "pending") currentStepIndex = 1;
  else if (rawStatus === "accepted" || rawStatus === "on the way" || rawStatus === "arriving") currentStepIndex = 2;
  else if (rawStatus === "arrived" || rawStatus === "in progress" || rawStatus === "repairing") currentStepIndex = 3;
  else if (rawStatus === "fixed / completed" || rawStatus === "completed") currentStepIndex = 4;

  const timelineSteps = [
    {
      id: 1,
      title: "Request Dispatched",
      desc: "Emergency breakdown sent to nearest workshop",
      time: "10:30 AM",
      status: currentStepIndex > 1 ? "completed" : currentStepIndex === 1 ? "current" : "upcoming",
    },
    {
      id: 2,
      title: "Mechanic Dispatched & En Route",
      desc: `${mechanicName} is navigating to your GPS spot`,
      time: "10:35 AM",
      status: currentStepIndex > 2 ? "completed" : currentStepIndex === 2 ? "current" : "upcoming",
    },
    {
      id: 3,
      title: "At Spot & Repair In Progress",
      desc: "Inspection & on-site breakdown resolution",
      time: "10:48 AM",
      status: currentStepIndex > 3 ? "completed" : currentStepIndex === 3 ? "current" : "upcoming",
    },
    {
      id: 4,
      title: "Vehicle Ready & Delivered",
      desc: "Test ride verified & digital receipt issued",
      time: "Expected",
      status: currentStepIndex >= 4 ? "completed" : "upcoming",
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-[#172033] pb-28 font-['DM_Sans',sans-serif]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-[#D5DEE5] flex items-center justify-center text-[#172033] hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-base font-extrabold text-[#172033] tracking-tight font-['Manrope']">
          Track Breakdown Rescue
        </h1>

        <button
          type="button"
          onClick={onLiveTracking}
          className="text-xs font-bold text-[#2F6B73] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <Navigation size={14} />
          <span>Live Map</span>
        </button>
      </div>

      {/* Service ID Card */}
      <div className="p-5 rounded-2xl bg-white border border-[#D5DEE5] shadow-xs mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-[#172033] tracking-wide">
            Service ID: <span className="text-[#2F6B73] font-mono">{serviceId}</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#EAF4FF] border border-[#BFDBFE] text-[#2F6B73] text-xs font-bold">
            In Progress
          </span>
        </div>

        <div className="text-xs text-[#64748B] space-y-1">
          <div>
            Vehicle: <span className="font-semibold text-[#172033]">{bikeName}</span>
          </div>
          <div>
            Requested on: <span className="font-semibold text-[#172033]">{dateFormatted}</span>
          </div>
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="p-5 rounded-2xl bg-white border border-[#D5DEE5] shadow-xs mb-5">
        <h2 className="text-sm font-bold text-[#172033] mb-5 tracking-wide flex items-center gap-2">
          <Wrench size={16} className="text-[#2F6B73]" />
          <span>Service Timeline</span>
        </h2>

        <div className="relative pl-7 space-y-6">
          {/* Vertical line connector */}
          <div className="absolute left-[11px] top-2 bottom-3 w-[2px] bg-gradient-to-b from-[#2F6B73] via-[#3B82F6] to-slate-200" />

          {timelineSteps.map((step) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";

            return (
              <div key={step.id} className="relative">
                {/* Node icon */}
                <div
                  className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-[#2F6B73] text-white shadow-xs"
                      : isCurrent
                      ? "bg-white border-2 border-[#2F6B73] text-[#2F6B73] ring-4 ring-[#2F6B73]/20 shadow-xs"
                      : "bg-slate-100 border border-slate-300 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[#2F6B73] animate-ping" />
                  ) : (
                    <Clock size={12} />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-xs font-bold ${
                        isCurrent
                          ? "text-[#2F6B73]"
                          : isCompleted
                          ? "text-[#172033]"
                          : "text-[#64748B]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <span className="text-[10px] text-[#64748B] font-mono">{step.time}</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assigned Mechanic Card */}
      <div className="p-4 rounded-2xl bg-white border border-[#D5DEE5] flex items-center justify-between shadow-xs mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#EAF4FF] text-[#2F6B73] border border-[#BFDBFE] flex items-center justify-center font-bold">
            <User size={20} />
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#2F6B73] uppercase tracking-wider">
              Assigned Mechanic
            </div>
            <div className="text-sm font-bold text-[#172033]">{mechanicName}</div>
            <div className="text-xs text-[#64748B]">{mechanicPhone}</div>
          </div>
        </div>

        <a
          href={`tel:${mechanicPhone.replace(/\D/g, "")}`}
          className="w-10 h-10 rounded-full bg-[#EAF4FF] hover:bg-blue-100 text-[#2F6B73] border border-[#BFDBFE] flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title="Call Mechanic"
        >
          <Phone size={17} />
        </a>
      </div>

      {/* CTA Button to Live Tracking Map */}
      <button
        type="button"
        onClick={onLiveTracking}
        className="w-full py-3.5 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Navigation size={18} />
        <span>Open Live Tracking Map</span>
      </button>

      {onCancel && booking?.status !== "Completed" && booking?.status !== "completed" && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-3 py-3 rounded-xl bg-slate-100 hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-xs font-bold transition-all cursor-pointer"
        >
          Cancel Service Request
        </button>
      )}
    </div>
  );
}
