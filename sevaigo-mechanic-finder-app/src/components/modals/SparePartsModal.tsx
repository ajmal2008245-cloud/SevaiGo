"use client";

import React, { useState } from "react";
import { Check, Cpu, Layers, Package, ShieldCheck, Sparkles, X } from "lucide-react";

interface SparePartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPart?: (partName: string) => void;
}

const SPARE_PARTS = [
  {
    id: "part-1",
    name: "Motul 7100 4T 10W-50 100% Synthetic Oil",
    category: "Fluids & Lubricants",
    price: 849,
    mrp: 999,
    rating: 4.9,
    compatibility: "Universal 150cc - 650cc Sportbikes",
    inStock: true,
  },
  {
    id: "part-2",
    name: "Brembo Premium Sintered Front Brake Pads",
    category: "Braking System",
    price: 1299,
    mrp: 1499,
    rating: 4.8,
    compatibility: "Yamaha FZ, R15, KTM Duke 200/250/390",
    inStock: true,
  },
  {
    id: "part-3",
    name: "D.I.D Heavy Duty 520 Pitch Gold X-Ring Chain",
    category: "Drive & Transmission",
    price: 2499,
    mrp: 2899,
    rating: 4.9,
    compatibility: "KTM Duke/RC, Yamaha MT-15, Dominar 400",
    inStock: true,
  },
  {
    id: "part-4",
    name: "NGK Laser Iridium Long-Life Spark Plug",
    category: "Ignition & Electrical",
    price: 599,
    mrp: 750,
    rating: 4.7,
    compatibility: "Royal Enfield 350/650, Bajaj Pulsar, Apache",
    inStock: true,
  },
  {
    id: "part-5",
    name: "Michelin Pilot Street 2 Radial Rear Tyre (140/70-17)",
    category: "Tyres & Wheels",
    price: 3750,
    mrp: 4200,
    rating: 4.9,
    compatibility: "Yamaha FZ, MT-15, Gixxer, CB300",
    inStock: true,
  },
];

export default function SparePartsModal({ isOpen, onClose, onSelectPart }: SparePartsModalProps) {
  const [addedIds, setAddedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAdd = (id: string, name: string) => {
    setAddedIds((prev) => [...prev, id]);
    if (onSelectPart) onSelectPart(name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#121820] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Top Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0D1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7900]/20 text-[#FF7900] flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight font-['Manrope']">
                Genuine OEM Spare Parts
              </h2>
              <p className="text-xs text-[#A5ADB8]">
                100% authentic components with warranty
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

        {/* Parts List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {SPARE_PARTS.map((part) => {
            const isAdded = addedIds.includes(part.id);
            return (
              <div
                key={part.id}
                className="p-4 rounded-xl bg-[#0D1117] border border-white/5 hover:border-white/15 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#FF7900] uppercase tracking-wider">
                      {part.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                      {part.name}
                    </h3>
                    <p className="text-[11px] text-[#A5ADB8] mt-1">
                      Fits: {part.compatibility}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-white">
                      ₹{part.price}
                    </div>
                    <div className="text-[11px] text-[#A5ADB8] line-through">
                      ₹{part.mrp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <ShieldCheck size={13} />
                    <span>In Stock · Official Warranty</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(part.id, part.name)}
                    disabled={isAdded}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isAdded
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-[#FF7900] hover:bg-[#ea580c] text-white shadow-[0_4px_12px_rgba(255,121,0,0.35)]"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        <span>Added</span>
                      </>
                    ) : (
                      <span>Add to Service</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0D1117] border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-[#A5ADB8]">
            Need a specific model part?
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
