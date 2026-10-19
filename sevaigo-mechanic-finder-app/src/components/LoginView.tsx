"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Info,
  Lock,
  Phone,
  RotateCw,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  FIREBASE_TEST_PHONE_NUMBERS,
  findFirebaseTestConfig,
  formatIndianPhoneNumber,
  verifyFirebaseTestCode,
} from "@/lib/firebase-test-config";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "@/lib/firebase";

interface LoginViewProps {
  onLoginSuccess: (phone: string, name?: string) => void;
  onContinueAsGuest?: () => void;
}

export default function LoginView({
  onLoginSuccess,
  onContinueAsGuest,
}: LoginViewProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [showTestCards, setShowTestCards] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Initialize invisible reCAPTCHA for Firebase Phone Auth when Firebase is configured
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        if (auth && !recaptchaVerifierRef.current) {
          const container = document.getElementById("recaptcha-container");
          if (container) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "invisible",
              callback: () => {},
            });
          }
        }
      } catch (err) {
        console.warn("[Firebase Auth] Recaptcha initialization notice:", err);
      }
    }

    return () => {
      try {
        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
      } catch {}
    };
  }, []);

  // Send Firebase Test OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    const formatted = formatIndianPhoneNumber(cleanPhone);
    const testConfig = findFirebaseTestConfig(cleanPhone);

    // If Firebase Web SDK is initialized with Project ID and API Key
    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase Auth could not be initialized.");

        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });
        }

        const confirmation = await signInWithPhoneNumber(auth, formatted, recaptchaVerifierRef.current);
        setConfirmationResult(confirmation);
        setLoading(false);
        setStep("otp");
        setCountdown(45);
        return;
      } catch (firebaseErr: any) {
        console.warn("[Firebase Phone Auth] SDK dispatch failed, evaluating test config:", firebaseErr);
        // If error occurred with SDK, fall back to registered Firebase test configuration
      }
    }

    // Free Firebase Test Number Verification Mode
    if (!testConfig) {
      setLoading(false);
      setError(
        "This number is not registered in Firebase Phone testing. Please select one of the configured test numbers below (e.g. +91 98765 43210) or add your number in Firebase Console -> Authentication -> Sign-in method -> Phone numbers for testing."
      );
      return;
    }

    setLoading(false);
    setStep("otp");
    setCountdown(45);

    // Launch countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Verify entered Test OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    const entered = otpInput.trim().replace(/\D/g, "");

    if (entered.length !== 6) {
      setError("Please enter the complete 6-digit test verification code.");
      return;
    }

    setLoading(true);

    // 1. If Firebase Confirmation Result exists (Cloud Auth confirmation)
    if (confirmationResult) {
      try {
        await confirmationResult.confirm(entered);
        setLoading(false);
        onLoginSuccess(cleanPhone, name.trim() || `Rider ${cleanPhone.slice(-4)}`);
        return;
      } catch (err: any) {
        setLoading(false);
        setError(
          "Incorrect verification code. Firebase rejected the OTP. Please enter the valid test code configured in Firebase Console."
        );
        return;
      }
    }

    // 2. Local Firebase Test Verification Configuration
    const verification = verifyFirebaseTestCode(cleanPhone, entered);
    if (!verification.success) {
      setLoading(false);
      setError(verification.error || "Incorrect verification code. Please check and try again.");
      return;
    }

    // Code matched the designated test code!
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(cleanPhone, name.trim() || `Rider ${cleanPhone.slice(-4)}`);
    }, 300);
  };

  const handleSelectTestNumber = (testNum: (typeof FIREBASE_TEST_PHONE_NUMBERS)[0]) => {
    setPhone(testNum.phoneNumber.replace("+91", ""));
    setError("");
  };

  const currentTestConfig = findFirebaseTestConfig(phone);

  return (
    <div className="relative min-h-screen w-full bg-[#07090C] text-white flex flex-col justify-between overflow-x-hidden select-none font-['DM_Sans',sans-serif]">
      {/* Invisible container for Firebase Recaptcha */}
      <div id="recaptcha-container" />

      {/* Background Cinematic Studio Motorcycle Glow */}
      <div
        className="absolute inset-0 bg-cover bg-center filter brightness-[0.55] opacity-30 pointer-events-none"
        style={{ backgroundImage: "url('/images/login-motorcycle.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090C] via-[#07090C]/85 to-[#07090C]/75 pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-[#FF7900]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Brand Badge */}
      <div className="relative z-10 p-5 flex items-center justify-between">
        {onContinueAsGuest && (
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white backdrop-blur-md transition-colors cursor-pointer"
            title="Continue as Guest"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/10 border border-[#FF7900]/25 text-[11px] font-bold text-[#FF7900] ml-auto">
          <Flame size={13} />
          <span>Firebase Phone Auth • Free Test Mode</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-4">
        {/* SevaiGo Official Logo Emblem */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative w-24 h-24 mb-2 drop-shadow-[0_10px_25px_rgba(255,121,0,0.45)]">
            <Image
              src="/images/sevaigo-logo.png"
              alt="SevaiGo Logo"
              fill
              priority
              className="object-contain rounded-2xl"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Manrope'] text-white tracking-tight">
            Sevai<span className="text-[#FF7900]">Go</span>
          </h1>
          <p className="text-xs text-[#A5ADB8] mt-1 font-medium">
            Vehicle Breakdown? We&apos;re On The Way!
          </p>
        </div>

        {/* Free Test Environment Notice Banner */}
        <div className="mb-4 p-3 rounded-2xl bg-[#121820]/90 border border-[#FF7900]/30 shadow-lg flex items-start gap-2.5">
          <Info size={16} className="text-[#FF7900] shrink-0 mt-0.5" />
          <div className="text-[11px] text-[#A5ADB8] leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Free Phone OTP Testing (Spark Plan)</span>
            Firebase validates test numbers with designated codes at <span className="text-[#FF7900] font-semibold">$0.00 cost</span>. No real SMS is delivered.
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 rounded-3xl bg-[#121820]/95 border border-white/10 backdrop-blur-xl shadow-2xl">
          {step === "phone" ? (
            /* STEP 1: MOBILE NUMBER INPUT */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} className="text-[#FF7900]" />
                  <span>Enter Mobile Number</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-[#A5ADB8] border-r border-white/10 pr-2.5">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setError("");
                    }}
                    placeholder="98765 43210"
                    autoFocus
                    className="w-full pl-24 pr-4 py-3.5 rounded-xl bg-[#0D1117] border border-white/10 text-white font-mono text-sm font-bold tracking-wider placeholder:text-[#A5ADB8]/40 focus:outline-none focus:border-[#FF7900] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#A5ADB8] block mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-[#A5ADB8]" />
                  <span>Your Name (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ajmal / Rider Name"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#0D1117] border border-white/10 text-white text-sm placeholder:text-[#A5ADB8]/40 focus:outline-none focus:border-[#FF7900] transition-colors"
                />
              </div>

              {/* Configured Test Numbers Quick Picker */}
              {showTestCards && (
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-[#A5ADB8] uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Configured Firebase Test Numbers:</span>
                  </div>
                  <div className="space-y-1.5">
                    {FIREBASE_TEST_PHONE_NUMBERS.map((testNum) => {
                      const isSelected = phone === testNum.phoneNumber.replace("+91", "");
                      return (
                        <button
                          key={testNum.phoneNumber}
                          type="button"
                          onClick={() => handleSelectTestNumber(testNum)}
                          className={`w-full p-2.5 rounded-xl text-left transition-all border flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#FF7900]/15 border-[#FF7900] text-white"
                              : "bg-[#0D1117] border-white/5 hover:border-white/15 text-[#A5ADB8] hover:text-white"
                          }`}
                        >
                          <div>
                            <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{testNum.formattedDisplay}</span>
                              <span className="text-[10px] text-[#FF7900] font-sans font-normal">
                                ({testNum.label})
                              </span>
                            </div>
                            <div className="text-[10px] text-[#A5ADB8] mt-0.5">
                              Test Verification Code: <span className="font-mono font-bold text-white">{testNum.testVerificationCode}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#FF7900]">
                            {isSelected ? "Selected" : "Use"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF7900] via-[#FFB020] to-[#ea580c] hover:brightness-110 active:scale-95 text-white font-black text-sm tracking-wide uppercase shadow-[0_10px_25px_rgba(255,121,0,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>Checking Test Number...</span>
                ) : (
                  <>
                    <span>Proceed to Test Verification</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#A5ADB8] pt-1">
                Free test authentication. Login is granted only when the designated test code matches.
              </p>
            </form>
          ) : (
            /* STEP 2: 6-DIGIT TEST OTP VERIFICATION */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">Enter Test Verification Code</h3>
                  <p className="text-xs text-[#A5ADB8] font-mono mt-0.5">
                    Testing +91 {phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                  className="text-xs text-[#FF7900] font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              {currentTestConfig && (
                <div className="p-3 rounded-xl bg-[#0D1117] border border-[#FF7900]/30 text-xs">
                  <div className="text-[#A5ADB8] text-[11px]">Configured Firebase Test Code for this number:</div>
                  <div className="font-mono text-base font-black text-[#FF7900] tracking-widest mt-0.5">
                    {currentTestConfig.testVerificationCode}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#A5ADB8] block mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-[#FF7900]" />
                  <span>Enter 6-Digit Test Code</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full py-3 px-4 rounded-xl bg-[#0D1117] border border-white/10 text-center font-mono text-2xl font-black tracking-[0.35em] text-[#FF7900] focus:outline-none focus:border-[#FF7900]"
                />
              </div>

              {/* Pre-fill helper button */}
              {currentTestConfig && (
                <button
                  type="button"
                  onClick={() => setOtpInput(currentTestConfig.testVerificationCode)}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#A5ADB8] hover:text-white font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={13} className="text-[#FF7900]" />
                  <span>Auto-fill test code ({currentTestConfig.testVerificationCode})</span>
                </button>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF7900] to-[#ea580c] hover:brightness-110 active:scale-95 text-white font-black text-sm tracking-wide uppercase shadow-[0_10px_25px_rgba(255,121,0,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Verifying Test Code...</span>
                ) : (
                  <>
                    <span>Verify Test OTP &amp; Enter</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-[#A5ADB8] pt-2">
                <span>Testing another number?</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                  className="text-[#FF7900] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCw size={12} />
                  <span>Switch Test Number</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Guest fallback link */}
        {onContinueAsGuest && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-xs text-[#A5ADB8] hover:text-white font-medium hover:underline cursor-pointer"
            >
              Skip and browse garages as Guest →
            </button>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 py-4 text-center text-[11px] text-[#A5ADB8]/70">
        SevaiGo Precision Roadside Assistance © {new Date().getFullYear()}
      </div>
    </div>
  );
}
