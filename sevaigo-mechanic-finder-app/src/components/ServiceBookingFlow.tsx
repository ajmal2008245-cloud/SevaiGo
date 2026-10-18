"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { MechanicView } from "@/lib/mechanic-shared";

interface ServiceBookingFlowProps {
  onBack: () => void;
  onBookingComplete: (bookingDetails: any) => void;
  nearbyShops: MechanicView[];
  userPhone?: string;
  userName?: string;
}

const SERVICE_CATALOG = [
  {
    id: "general",
    title: "General Service",
    price: 499,
    duration: "2-3 Hours",
    description: "Complete 25-point inspection, engine oil check, spark plug cleaning, and wash.",
    icon: Wrench,
  },
  {
    id: "oil",
    title: "Oil Change",
    price: 299,
    duration: "45 Mins",
    description: "Premium synthetic blend engine oil replacement & oil filter cleanup.",
    icon: Sparkles,
  },
  {
    id: "chain",
    title: "Chain Cleaning",
    price: 199,
    duration: "30 Mins",
    description: "Ultrasonic chain degreasing, slack adjustment & Motul lube coating.",
    icon: Bike,
  },
  {
    id: "brake",
    title: "Brake Check",
    price: 399,
    duration: "1 Hour",
    description: "Front & rear brake disc / drum inspection, pad deburring & fluid top-up.",
    icon: ShieldCheck,
  },
  {
    id: "full_body",
    title: "Full Body Check",
    price: 599,
    duration: "3-4 Hours",
    description: "Comprehensive 40-point chassis, suspension, electrical & ECU scan.",
    icon: Compass,
  },
];

const POPULAR_BIKES = [
  "Yamaha FZ",
  "Royal Enfield Classic 350",
  "KTM Duke 250",
  "Bajaj Pulsar 150/200",
  "TVS Apache RTR",
  "Honda CB350",
  "Yamaha MT-15",
  "Hero Splendor Plus",
];

const TIME_SLOTS = [
  { id: "morning-1", label: "09:00 AM - 11:00 AM", period: "Morning" },
  { id: "morning-2", label: "11:00 AM - 01:00 PM", period: "Morning" },
  { id: "afternoon-1", label: "02:00 PM - 04:00 PM", period: "Afternoon" },
  { id: "evening-1", label: "04:00 PM - 06:00 PM", period: "Evening" },
  { id: "evening-2", label: "06:00 PM - 08:00 PM", period: "Evening" },
];

export default function ServiceBookingFlow({
  onBack,
  onBookingComplete,
  nearbyShops,
  userPhone = "",
  userName = "Rider",
}: ServiceBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState("general");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState("morning-1");
  const [selectedBike, setSelectedBike] = useState("Yamaha FZ");
  const [customBike, setCustomBike] = useState("");
  const [selectedGarageId, setSelectedGarageId] = useState<string>(
    nearbyShops[0]?.id || "default-garage"
  );
  const [serviceType, setServiceType] = useState<"garage" | "doorstep">("doorstep");
  const [contactPhone, setContactPhone] = useState(userPhone || "9876543210");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService =
    SERVICE_CATALOG.find((s) => s.id === selectedServiceId) || SERVICE_CATALOG[0];
  const chosenGarage =
    nearbyShops.find((g) => g.id === selectedGarageId) ||
    nearbyShops[0] || {
      id: "demo-garage",
      shopName: "Rider's Garage & Speed Care",
      address: "Anna Nagar Main Road, Chennai",
      phone: "+91 98765 43210",
      rating: 4.8,
    };

  const bikeFinal = customBike.trim() || selectedBike;

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBack();
    }
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    const bookingRef = `SG#${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking = {
      id: bookingRef,
      referenceId: bookingRef,
      service: selectedService.title,
      price: selectedService.price,
      bike: bikeFinal,
      date: selectedDate,
      timeSlot: TIME_SLOTS.find((s) => s.id === selectedSlot)?.label || "10:00 AM",
      garageName: chosenGarage.shopName,
      garagePhone: chosenGarage.phone,
      serviceType,
      contactPhone,
      notes,
      status: "In Progress",
      createdAt: new Date().toISOString(),
      mechanic: {
        name: "Ravi Kumar",
        phone: "+91 98765 43210",
        role: "Senior Master Technician",
      },
    };

    // Store in localStorage for active tracking
    try {
      localStorage.setItem("activeBooking", JSON.stringify(newBooking));
      const existing = JSON.parse(localStorage.getItem("userBookings") || "[]");
      existing.unshift(newBooking);
      localStorage.setItem("userBookings", JSON.stringify(existing));
    } catch {}

    setTimeout(() => {
      setIsSubmitting(false);
      onBookingComplete(newBooking);
    }, 600);
  };

  const steps = [
    { num: 1, label: "Service" },
    { num: 2, label: "Date & Time" },
    { num: 3, label: "Details" },
    { num: 4, label: "Confirm" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 md:py-6 text-white pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={handlePrev}
          className="w-10 h-10 rounded-full bg-[#121820] border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-lg md:text-xl font-extrabold text-white tracking-tight">
          Book Service
        </h1>

        <div className="w-10" />
      </div>

      {/* Stepper Bar */}
      <div className="flex items-center justify-between mb-7 px-2">
        {steps.map((s, idx) => {
          const isDone = currentStep > s.num;
          const isActive = currentStep === s.num;
          return (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isDone
                      ? "bg-[#FF7900] text-white shadow-[0_0_15px_rgba(255,121,0,0.5)]"
                      : isActive
                      ? "bg-[#FF7900] text-white ring-4 ring-[#FF7900]/25 shadow-[0_0_15px_rgba(255,121,0,0.4)]"
                      : "bg-[#121820] border border-white/10 text-[#A5ADB8]"
                  }`}
                >
                  {isDone ? <Check size={16} strokeWidth={3} /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-medium tracking-wide ${
                    isActive ? "text-[#FF7900] font-bold" : "text-[#A5ADB8]"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 -mt-4 transition-colors duration-300 ${
                    currentStep > s.num ? "bg-[#FF7900]" : "bg-white/10"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: SELECT SERVICE */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">
              Select Service
            </h2>
            <span className="text-xs text-[#FF7900] font-semibold">
              Prices include tax & labor
            </span>
          </div>

          <div className="space-y-3">
            {SERVICE_CATALOG.map((item) => {
              const isSelected = selectedServiceId === item.id;
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedServiceId(item.id)}
                  className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-[#121820] border-[#FF7900] shadow-[0_0_20px_rgba(255,121,0,0.2)]"
                      : "bg-[#0D1117] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 pr-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#FF7900]/20 text-[#FF7900]"
                          : "bg-white/5 text-[#A5ADB8]"
                      }`}
                    >
                      <IconComp size={20} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#A5ADB8]">
                          {item.duration}
                        </span>
                      </div>
                      <p className="text-xs text-[#A5ADB8] mt-1 leading-snug">
                        {item.description}
                      </p>
                      <div className="text-sm font-extrabold text-[#FF7900] mt-2">
                        ₹{item.price}{" "}
                        <span className="text-[11px] font-normal text-[#A5ADB8]">
                          onwards
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "border-[#FF7900]" : "border-white/20"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF7900]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DATE & TIME */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Select Date</h2>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#121820] border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-[#FF7900]"
              />
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">Available Time Slot</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#121820] border-[#FF7900] shadow-[0_0_15px_rgba(255,121,0,0.25)]"
                        : "bg-[#0D1117] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock
                        size={16}
                        className={isSelected ? "text-[#FF7900]" : "text-[#A5ADB8]"}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{slot.label}</div>
                        <div className="text-[10px] text-[#A5ADB8]">{slot.period}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[#FF7900]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Preference Mode */}
          <div>
            <h2 className="text-base font-bold text-white mb-2">Service Mode</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setServiceType("doorstep")}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  serviceType === "doorstep"
                    ? "bg-[#121820] border-[#FF7900] shadow-[0_0_15px_rgba(255,121,0,0.25)]"
                    : "bg-[#0D1117] border-white/10"
                }`}
              >
                <div className="text-sm font-bold text-white">Doorstep Pickup</div>
                <div className="text-[10px] text-[#A5ADB8] mt-0.5">
                  Mechanic collects your bike
                </div>
              </button>

              <button
                type="button"
                onClick={() => setServiceType("garage")}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  serviceType === "garage"
                    ? "bg-[#121820] border-[#FF7900] shadow-[0_0_15px_rgba(255,121,0,0.25)]"
                    : "bg-[#0D1117] border-white/10"
                }`}
              >
                <div className="text-sm font-bold text-white">Drive-in to Garage</div>
                <div className="text-[10px] text-[#A5ADB8] mt-0.5">
                  Drop off directly
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DETAILS (BIKE & GARAGE) */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Select Your Bike</h2>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_BIKES.map((bike) => {
                const isSelected = selectedBike === bike && !customBike;
                return (
                  <button
                    key={bike}
                    type="button"
                    onClick={() => {
                      setSelectedBike(bike);
                      setCustomBike("");
                    }}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#121820] border-[#FF7900] text-white shadow-[0_0_12px_rgba(255,121,0,0.2)]"
                        : "bg-[#0D1117] border-white/10 text-[#A5ADB8] hover:text-white"
                    }`}
                  >
                    {bike}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Or type other bike model (e.g. Continental GT 650)"
                value={customBike}
                onChange={(e) => setCustomBike(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#121820] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF7900]"
              />
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">Preferred Workshop</h2>
            <select
              value={selectedGarageId}
              onChange={(e) => setSelectedGarageId(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-[#121820] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FF7900] cursor-pointer"
            >
              {nearbyShops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.shopName} ({shop.distanceKm} km away • ★ {shop.rating})
                </option>
              ))}
              <option value="default-garage">Rider's Garage & Speed Care (1.2 km away)</option>
            </select>
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">Contact Mobile Number</h2>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="10-digit phone number"
              className="w-full px-4 py-3 rounded-xl bg-[#121820] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-2">
              Any specific issues or symptoms? (Optional)
            </h2>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unusual noise from front disc brake, low pickup"
              className="w-full px-4 py-2.5 rounded-xl bg-[#121820] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FF7900]"
            />
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & CONFIRM */}
      {currentStep === 4 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121820] to-[#0D1117] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[11px] font-semibold text-[#FF7900] uppercase tracking-wider">
                  Service Summary
                </span>
                <h3 className="text-lg font-bold text-white">{selectedService.title}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#A5ADB8]">Estimated Cost</span>
                <div className="text-xl font-extrabold text-[#FF7900]">
                  ₹{selectedService.price}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A5ADB8]">Motorcycle</span>
                <span className="font-bold text-white">{bikeFinal}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A5ADB8]">Date & Slot</span>
                <span className="font-bold text-white">
                  {selectedDate} • {TIME_SLOTS.find((s) => s.id === selectedSlot)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A5ADB8]">Workshop</span>
                <span className="font-bold text-white">{chosenGarage.shopName}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A5ADB8]">Service Mode</span>
                <span className="font-bold text-[#FF7900]">
                  {serviceType === "doorstep" ? "Doorstep Pickup" : "Direct Drive-in"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A5ADB8]">Contact</span>
                <span className="font-bold text-white">+91 {contactPhone}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FF7900]/10 border border-[#FF7900]/25 flex items-center gap-3">
            <ShieldCheck size={24} className="text-[#FF7900] shrink-0" />
            <p className="text-xs text-[#A5ADB8] leading-tight">
              Pay upon completion. All services include a 15-day service guarantee & genuine parts warranty.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#07090C]/90 backdrop-blur-md border-t border-white/10 z-40">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-3.5 rounded-full bg-[#121820] border border-white/15 text-white font-bold text-sm hover:bg-white/10 transition-colors cursor-pointer"
            >
              Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 rounded-full bg-[#FF7900] hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(255,121,0,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalConfirm}
              className="flex-1 py-3.5 rounded-full bg-[#FF7900] hover:bg-[#ea580c] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(255,121,0,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirming Booking...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
