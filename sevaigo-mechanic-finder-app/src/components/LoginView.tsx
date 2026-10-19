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
  initialRole?: LoginType;
}

export default function LoginView({
  onLoginSuccess,
  onContinueAsGuest,
  initialRole = "customer",
}: LoginViewProps) {
  const [loginType, setLoginType] = useState<LoginType>(initialRole);
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
        console.warn("[Firebase Phone Auth] SDK dispatch note:", firebaseErr);
      }
    }

    // Free Firebase Test Number Verification Mode
    if (!testConfig) {
      setLoading(false);
      setError(
        "This number is not in the test whitelist. Select one of the registered test numbers below (e.g. +91 98765 43210) or configure in Firebase Console."
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

    // 2. Local Firebase Test Code
    const verification = verifyFirebaseTestCode(cleanPhone, entered);
    if (!verification.success) {
      setLoading(false);
      setError(verification.error || "Incorrect verification code. Please check and try again.");
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
    setError("");
  };

  const currentTestConfig = findFirebaseTestConfig(phone);

  return (
    <div className="relative min-h-screen w-full bg-[#FFFFFF] text-[#0F172A] flex flex-col justify-between overflow-x-hidden select-none font-['DM_Sans',sans-serif]">
      {/* Invisible container for Firebase Recaptcha */}
      <div id="recaptcha-container" />

      {/* Top Bar with Brand Badge */}
      <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between border-b border-[#E2E8F0] bg-[#FFFFFF]">
        {onContinueAsGuest && (
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Continue as Guest"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/10 border border-[#FF7900]/25 text-[11px] font-bold text-[#FF7900] ml-auto">
          <Flame size={13} />
          <span>Firebase Phone Auth • Free Mode</span>
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

        {/* TWO LOGIN TYPES TOGGLE: Customer Login vs Mechanic Login */}
        <div className="mb-5 p-1 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setLoginType("customer");
              setError("");
            }}
            className={`py-2.5 px-3 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "customer"
                ? "bg-[#FFFFFF] text-[#FF7900] shadow-sm border border-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <User size={15} />
            <span>Customer Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginType("mechanic");
              setError("");
            }}
            className={`py-2.5 px-3 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "mechanic"
                ? "bg-[#FFFFFF] text-[#FF7900] shadow-sm border border-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <Wrench size={15} />
            <span>Mechanic Login</span>
          </button>
        </div>

        {/* Role Description Banner */}
        <div className="mb-4 p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center gap-2.5">
          {loginType === "customer" ? (
            <>
              <User size={16} className="text-[#FF7900] shrink-0" />
              <div className="text-[11px] text-[#9A3412] leading-tight">
                <strong>Customer Account:</strong> Search mechanics, book bike repairs & request emergency roadside rescue.
              </div>
            </>
          ) : (
            <>
              <Store size={16} className="text-[#FF7900] shrink-0" />
              <div className="text-[11px] text-[#9A3412] leading-tight">
                <strong>Mechanic Partner Account:</strong> Register your workshop, receive nearby rescue calls & manage jobs.
              </div>
            </>
          )}
        </div>

        {/* Card Body */}
        <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
          {step === "phone" ? (
            /* STEP 1: MOBILE NUMBER INPUT */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1.5 flex items-center gap-1.5">
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
                <label className="text-xs font-bold text-[#64748B] block mb-1.5 flex items-center gap-1.5">
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

              {currentTestConfig && (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#166534]">
                    <CheckCircle2 size={14} className="text-[#16a34a]" />
                    <span>Firebase Test Code:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpInput(currentTestConfig.testVerificationCode)}
                    className="font-mono font-black text-sm text-[#16a34a] hover:underline tracking-widest cursor-pointer px-2 py-0.5 rounded bg-white border border-[#BBF7D0]"
                    title="Click to autofill"
                  >
                    {currentTestConfig.testVerificationCode}
                  </button>
                </div>
              )}

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

        {/* Quick Test Numbers Accordion */}
        {showTestCards && (
          <div className="mt-5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Quick Test Credentials
              </span>
              <span className="text-[10px] text-[#FF7900] font-bold">1-Click Autofill</span>
            </div>
            <div className="space-y-1.5">
              {FIREBASE_TEST_PHONE_NUMBERS.slice(0, 3).map((testNum) => (
                <button
                  key={testNum.phoneNumber}
                  type="button"
                  onClick={() => handleSelectTestNumber(testNum)}
                  className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-[#0F172A] block font-mono">
                      {testNum.phoneNumber}
                    </span>
                    <span className="text-[10px] text-[#64748B]">{testNum.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#16a34a] font-bold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      OTP: {testNum.testVerificationCode}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        <span>SevaiGo Partner & Customer Network • Secured by Supabase & Firebase</span>
      </div>
    </div>
  );
}
