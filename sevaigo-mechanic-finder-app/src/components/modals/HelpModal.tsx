"use client";

import React from "react";
import {
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Phone,
  ShieldCheck,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#D5DEE5] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#D5DEE5] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#2F6B73] border border-[#BFDBFE] flex items-center justify-center">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#172033] tracking-tight font-['Manrope']">
                Help & 24/7 Support
              </h2>
              <p className="text-xs text-[#64748B]">
                Instant roadside assistance & expert rider care
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-[#172033] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Emergency SOS Banner */}
          <div className="p-4 rounded-xl bg-[#EAF4FF] border border-[#BFDBFE] flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-bold text-[#2F6B73] uppercase tracking-wider">
              <Zap size={16} fill="currentColor" />
              <span>Breakdown SOS Assistance</span>
            </div>
            <p className="text-[#172033] leading-relaxed">
              Stranded on the road with a puncture, dead battery, or mechanical fault? Our nearest verified mechanic will dispatch immediately.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEmergencyRescue();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] text-white font-bold tracking-wide uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Zap size={14} fill="currentColor" />
              <span>Launch Roadside Rescue Form</span>
            </button>
          </div>

          {/* Direct Contact Options */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:1800123456"
              className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] hover:border-slate-400 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#EAF4FF] text-[#2F6B73] flex items-center justify-center">
                <Phone size={18} />
              </div>
              <span className="font-bold text-[#172033]">Call 24/7 Hotline</span>
              <span className="text-[11px] text-[#64748B]">Toll-Free Support</span>
            </a>

            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] hover:border-slate-400 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
              <span className="font-bold text-[#172033]">WhatsApp Chat</span>
              <span className="text-[11px] text-[#64748B]">Instant Response</span>
            </a>
          </div>

          {/* Quick FAQs */}
          <div className="space-y-2 pt-2">
            <h3 className="font-bold uppercase tracking-wider text-[#64748B] text-[11px]">
              Frequently Asked Questions
            </h3>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] space-y-1">
              <strong className="text-[#172033] block">How fast does a mechanic arrive?</strong>
              <p className="text-[#64748B] leading-relaxed m-0">
                A verified mechanic within 7 km is notified immediately upon request submission and usually arrives within 15–25 minutes.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] space-y-1">
              <strong className="text-[#172033] block">Are spare parts genuine?</strong>
              <p className="text-[#64748B] leading-relaxed m-0">
                Yes. All engine oils, puncture repair kits, tubes, and batteries provided by our verified workshops are 100% genuine products.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#F8FAFC] border-t border-[#D5DEE5] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#172033] border border-[#D5DEE5] font-bold text-xs transition-colors cursor-pointer"
          >
            Close Support
          </button>
        </div>
      </div>
    </div>
  );
}
