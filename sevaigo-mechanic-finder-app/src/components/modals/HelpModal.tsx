"use client";

import React from "react";
import {
  Clock,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Phone,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyRescue: () => void;
}

export default function HelpModal({ isOpen, onClose, onEmergencyRescue }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#121820] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0D1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight font-['Manrope']">
                Help & 24/7 Support
              </h2>
              <p className="text-xs text-[#A5ADB8]">
                Instant roadside assistance & expert rider care
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#A5ADB8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Emergency SOS Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-600/20 via-[#FF7900]/20 to-red-600/20 border border-red-500/30 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <Zap size={16} fill="currentColor" />
              <span>Breakdown SOS Assistance</span>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              Stranded on the road with a puncture, dead battery, or mechanical fault? Our nearest verified mechanic will dispatch immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEmergencyRescue();
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Zap size={14} fill="currentColor" />
              <span>Launch Roadside Rescue Wizard</span>
            </button>
          </div>

          {/* Direct Contact Options */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:1800123456"
              className="p-3.5 rounded-xl bg-[#0D1117] border border-white/5 hover:border-white/20 transition-all flex flex-col items-center text-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
                <Phone size={18} />
              </div>
              <span className="text-xs font-bold text-white">Call 24/7 Hotline</span>
              <span className="text-[11px] text-[#A5ADB8]">Toll-Free Support</span>
            </a>

            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#0D1117] border border-white/5 hover:border-white/20 transition-all flex flex-col items-center text-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
              <span className="text-xs font-bold text-white">WhatsApp Chat</span>
              <span className="text-[11px] text-[#A5ADB8]">Instant Response</span>
            </a>
          </div>

          {/* Quick FAQs */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A5ADB8]">
              Frequently Asked Questions
            </h3>

            <div className="p-3 rounded-xl bg-[#0D1117] border border-white/5 text-xs space-y-1">
              <strong className="text-white block">How does Doorstep Pickup work?</strong>
              <p className="text-[#A5ADB8] leading-relaxed m-0">
                A verified mechanic will visit your location at the chosen time slot, inspect your motorcycle, and carry out routine servicing on the spot or transport to workshop for major repairs.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1117] border border-white/5 text-xs space-y-1">
              <strong className="text-white block">Are parts 100% genuine OEM?</strong>
              <p className="text-[#A5ADB8] leading-relaxed m-0">
                Yes. All oils, brake pads, filters, and transmission parts supplied via SevaiGo are genuine factory OEM or authorized performance brands with manufacturer warranties.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0D1117] border-t border-white/10 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Support
          </button>
        </div>
      </div>
    </div>
  );
}
