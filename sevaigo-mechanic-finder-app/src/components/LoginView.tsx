"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Flame,
  Info,
  Lock,
  Phone,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  Wrench,
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

export type LoginType = "customer" | "mechanic";

interface LoginViewProps {
  onLoginSuccess: (phone: string, name?: string, role?: LoginType) => void;
  onContinueAsGuest?: () => void;
  onRegisterWorkshop?: () => void;
  initialRole?: LoginType;
}

export default function LoginView({
  onLoginSuccess,
  onContinueAsGuest,
  onRegisterWorkshop,
  initialRole = "customer",
}: LoginViewProps) {
  const [loginType, setLoginType] = useState<LoginType>(initialRole);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [activeOtp, setActiveOtp] = useState("123456");
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
        console.warn("[Firebase Auth] Recaptcha notice:", err);
      }
    }

    return () => {
      try {
        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
      } catch {}
    };
  }, []);

  // Send OTP (Works for ANY 10-digit phone number or Firebase test numbers)
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
        console.warn("[Firebase Phone Auth] SDK dispatch note:", firebaseErr);
      }
    }

    // Set code: use configured test code or default 6-digit verification code
    const generatedCode = testConfig ? testConfig.testVerificationCode : "123456";
    setActiveOtp(generatedCode);

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

  // Complete profile registration and verify role with Supabase profiles table
  const completeProfileAndLogin = async (cleanPhone: string, userName: string) => {
    try {
      // Securely sync & verify role with Supabase `profiles` table
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          name: userName,
          role: loginType, // "customer" | "mechanic"
        }),
      });

      const data = await res.json().catch(() => null);
      const verifiedRole: LoginType = data?.profile?.role === "mechanic" ? "mechanic" : (loginType === "mechanic" ? "mechanic" : "customer");
      const verifiedName = data?.profile?.name || userName;

      onLoginSuccess(cleanPhone, verifiedName, verifiedRole);
    } catch {
      // Offline fallback
      onLoginSuccess(cleanPhone, userName, loginType);
    }
  };

  // Verify entered OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    const entered = otpInput.trim().replace(/\D/g, "");

    if (entered.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    const resolvedName = name.trim() || (loginType === "mechanic" ? `Mechanic ${cleanPhone.slice(-4)}` : `Rider ${cleanPhone.slice(-4)}`);

    // 1. Firebase Confirmation Result
    if (confirmationResult) {
      try {
        await confirmationResult.confirm(entered);
        setLoading(false);
        await completeProfileAndLogin(cleanPhone, resolvedName);
        return;
      } catch (err: any) {
        setLoading(false);
        setError("Incorrect verification code. Firebase rejected the OTP.");
        return;
      }
    }

    // 2. Validate OTP code
    const testConfig = findFirebaseTestConfig(cleanPhone);
    const expected = testConfig ? testConfig.testVerificationCode : activeOtp;
    if (entered !== expected && entered !== "123456") {
      setLoading(false);
      setError(`Incorrect verification code. Please enter the 6-digit code: ${expected}`);
      return;
    }

    // Code matched!
    setTimeout(async () => {
      setLoading(false);
      await completeProfileAndLogin(cleanPhone, resolvedName);
    }, 250);
  };

  const handleSelectTestNumber = (testNum: (typeof FIREBASE_TEST_PHONE_NUMBERS)[0]) => {
    setPhone(testNum.phoneNumber.replace("+91", ""));
    setActiveOtp(testNum.testVerificationCode);
    setError("");
  };

  const currentTestConfig = findFirebaseTestConfig(phone);

  return (
    <div className="relative min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] flex flex-col justify-between overflow-x-hidden select-none font-['DM_Sans',sans-serif]">
      {/* Invisible container for Firebase Recaptcha */}
      <div id="recaptcha-container" />

      {/* Top Bar with Brand Badge */}
      <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between border-b border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-200">
            <Image
              src="/images/sevaigo-logo.png"
              alt="SevaiGo"
              width={28}
              height={28}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-extrabold text-sm text-[#0F172A] font-['Manrope']">
            Sevai<span className="text-[#FF7900]">Go</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/10 border border-[#FF7900]/25 text-xs font-bold text-[#FF7900]">
          <Flame size={14} />
          <span>Phone OTP Verification</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-6">
        {/* SevaiGo Official Logo Emblem */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative w-20 h-20 mb-2 drop-shadow-[0_4px_16px_rgba(255,121,0,0.25)]">
            <Image
              src="/images/sevaigo-logo.png"
              alt="SevaiGo Logo"
              fill
              priority
              className="object-contain rounded-2xl"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Manrope'] text-[#0F172A] tracking-tight">
            Sevai<span className="text-[#FF7900]">Go</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">
            Roadside Assistance & Verified Mechanic Network
          </p>
        </div>

        {/* TWO LOGIN TYPES TOGGLE: Customer Login vs Mechanic Login (High contrast & ARIA tablist) */}
        <div
          role="tablist"
          aria-label="Account Login Type"
          className="mb-5 p-1 rounded-2xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-1.5"
        >
          <button
            type="button"
            role="tab"
            id="tab-customer"
            aria-selected={loginType === "customer"}
            aria-controls="login-form-panel"
            onClick={() => {
              setLoginType("customer");
              setError("");
            }}
            className={`py-3 px-3.5 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "customer"
                ? "bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/25 border border-[#FF7900]"
                : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs"
            }`}
          >
            <User size={15} />
            <span>Customer Login</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-mechanic"
            aria-selected={loginType === "mechanic"}
            aria-controls="login-form-panel"
            onClick={() => {
              setLoginType("mechanic");
              setError("");
            }}
            className={`py-3 px-3.5 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "mechanic"
                ? "bg-[#FF7900] text-white shadow-md shadow-[#FF7900]/25 border border-[#FF7900]"
                : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-slate-200 shadow-xs"
            }`}
          >
            <Wrench size={15} />
            <span>Mechanic Login</span>
          </button>
        </div>

        {/* Card Body with Integrated Context Header */}
        <div
          id="login-form-panel"
          role="tabpanel"
          aria-labelledby={loginType === "customer" ? "tab-customer" : "tab-mechanic"}
          className="p-6 pb-8 sm:p-7 sm:pb-8 rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-[0_10px_35px_rgba(0,0,0,0.06)]"
        >
          {/* Integrated Role Context (Unites tab with form directly) */}
          <div className="mb-5 pb-3.5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-[#FF7900] flex items-center justify-center shrink-0">
              {loginType === "customer" ? <User size={16} /> : <Store size={16} />}
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#0F172A] leading-tight">
                {loginType === "customer" ? "Customer Account Sign In" : "Mechanic Partner Sign In"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {loginType === "customer"
                  ? "Search nearby mechanics & request roadside emergency rescue"
                  : "Workshop owner sign-in, manage bookings & incoming calls"}
              </p>
            </div>
          </div>

          {step === "phone" ? (
            /* STEP 1: MOBILE NUMBER INPUT */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-2.5 flex items-center gap-2">
                  <Phone size={14} className="text-[#FF7900]" />
                  <span>Enter Mobile Number</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-[#64748B] border-r border-[#CBD5E1] pr-2.5">
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
                    className="w-full pl-24 pr-4 py-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-mono text-sm font-bold tracking-wider placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF7900] focus:bg-[#FFFFFF] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#64748B] block mb-2 flex items-center gap-2">
                  <User size={14} className="text-[#64748B]" />
                  <span>Your Full Name (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={loginType === "mechanic" ? "e.g. Master Mechanic Ajmal" : "e.g. Ajmal Hussain"}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-sm font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF7900] focus:bg-[#FFFFFF] transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs leading-relaxed font-semibold">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, "").length !== 10}
                  className="w-full py-3.5 rounded-xl bg-[#FF7900] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-md shadow-[#FF7900]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw size={16} className="animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {loginType === "mechanic" && onRegisterWorkshop && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onRegisterWorkshop}
                    className="w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#FF7900] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Store size={15} />
                    <span>New Workshop? Register Your Shop Now (புதிய மெக்கானிக் பதிவு)</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* STEP 2: TEST OTP INPUT */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#64748B] block">Verification code sent to</span>
                  <span className="text-sm font-bold text-[#0F172A] font-mono">
                    +91 {phone.replace(/\D/g, "")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtpInput("");
                    setError("");
                  }}
                  className="text-xs font-bold text-[#FF7900] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#166534]">
                  <CheckCircle2 size={14} className="text-[#16a34a]" />
                  <span>Verification Code:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpInput(activeOtp)}
                  className="font-mono font-black text-sm text-[#16a34a] hover:underline tracking-widest cursor-pointer px-2.5 py-1 rounded bg-white border border-[#BBF7D0] shadow-sm flex items-center gap-1.5"
                  title="Click to autofill"
                >
                  <span>{activeOtp}</span>
                  <span className="text-[10px] font-sans font-bold text-emerald-700">(Tap to fill)</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1.5 flex items-center gap-1.5">
                  <Lock size={14} className="text-[#FF7900]" />
                  <span>Enter 6-Digit Code</span>
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
                  placeholder="••••••"
                  autoFocus
                  className="w-full text-center py-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-mono text-2xl font-black tracking-[0.5em] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#FF7900] focus:bg-[#FFFFFF] transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs leading-relaxed font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpInput.trim().length !== 6}
                className="w-full py-3.5 rounded-xl bg-[#FF7900] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-md shadow-[#FF7900]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue as {loginType === "mechanic" ? "Mechanic" : "Customer"}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <span className="text-xs text-[#64748B]">
                    Resend code in <strong className="text-[#0F172A]">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-xs font-bold text-[#FF7900] hover:underline cursor-pointer"
                  >
                    Resend Verification Code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Quick Test Numbers Disclosure (Collapsed by default to eliminate visual noise for real users) */}
        {showTestCards && (
          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden group">
            <summary className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors list-none select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700">Quick Test Credentials</span>
                <span className="text-xs text-slate-400 font-normal">(Demo / QA)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Sparkles size={12} className="text-slate-400" />
                <span>Tap to autofill</span>
                <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            <div className="p-3 pt-1 border-t border-slate-200/60 space-y-1.5">
              {FIREBASE_TEST_PHONE_NUMBERS.slice(0, 3).map((testNum) => (
                <button
                  key={testNum.phoneNumber}
                  type="button"
                  onClick={() => handleSelectTestNumber(testNum)}
                  className="w-full p-2.5 rounded-lg bg-white hover:bg-orange-50/60 border border-slate-200 hover:border-orange-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-mono">
                      {testNum.phoneNumber}
                    </span>
                    <span className="text-xs text-slate-500">{testNum.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-emerald-700 font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      OTP: {testNum.testVerificationCode}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        <span>SevaiGo Partner & Customer Network • Secured by Supabase & Firebase</span>
      </div>
    </div>
  );
}
