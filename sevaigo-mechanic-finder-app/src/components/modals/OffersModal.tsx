"use client";

import React, { useState } from "react";
import { Check, Copy, Percent, Sparkles, Tag, X } from "lucide-react";

interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCode?: (code: string) => void;
}

const OFFERS = [
  {
    code: "RIDE50",
    title: "₹150 Flat Discount",
    desc: "Valid on all General & Full Body Check bike service packages above ₹499.",
    expiry: "Valid till end of month",
    badge: "MOST POPULAR",
  },
  {
    code: "FREECHAIN",
    title: "Free Motul Chain Lube",
    desc: "Complimentary ultrasonic chain degreasing & Motul synthetic lube with any routine service.",
    expiry: "Limited weekend offer",
    badge: "EXCLUSIVE",
  },
  {
    code: "NEWBIKE20",
    title: "20% Off First Booking",
    desc: "Welcome offer for newly registered riders on the SevaiGo precision network.",
    expiry: "Valid on 1st service",
    badge: "NEW RIDER",
  },
];

export default function OffersModal({ isOpen, onClose, onApplyCode }: OffersModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    if (onApplyCode) onApplyCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#121820] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0D1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight font-['Manrope']">
                Offers & Discounts
              </h2>
              <p className="text-xs text-[#A5ADB8]">
                Save more on every certified service
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

        {/* Offers List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {OFFERS.map((offer) => {
            const isCopied = copiedCode === offer.code;
            return (
              <div
                key={offer.code}
                className="p-4 rounded-xl bg-[#0D1117] border border-dashed border-[#FF7900]/40 relative overflow-hidden flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF7900]/15 text-[#FF7900] uppercase tracking-wider">
                    {offer.badge}
                  </span>
                  <span className="text-[10px] text-[#A5ADB8]">{offer.expiry}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{offer.title}</h3>
                  <p className="text-xs text-[#A5ADB8] mt-0.5 leading-snug">
                    {offer.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                  <span className="font-mono text-xs font-black text-white px-2.5 py-1 rounded bg-black/40 border border-white/10 tracking-widest">
                    {offer.code}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(offer.code)}
                    className="px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-[#ea580c] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_3px_10px_rgba(255,121,0,0.35)]"
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        <span>Applied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Apply Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0D1117] border-t border-white/10 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
