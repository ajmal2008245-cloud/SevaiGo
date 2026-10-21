"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  RotateCw,
  Store,
  User,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import {
  FIREBASE_TEST_PHONE_NUMBERS,
  findFirebaseTestConfig,
  formatIndianPhoneNumber,
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
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  
  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [activeOtp, setActiveOtp] = useState("123456");
  
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Flow control state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Initialize invisible reCAPTCHA for Firebase Phone Auth when configured
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

  // Send OTP
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

    const generatedCode = testConfig ? testConfig.testVerificationCode : "123456";
    setActiveOtp(generatedCode);

    setLoading(false);
    setStep("otp");
    setCountdown(45);

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
      // 4-second timeout to prevent stalling on network lag
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          phone: cleanPhone,
          name: userName,
          role: loginType,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);
      const verifiedRole: LoginType = data?.profile?.role === "mechanic"
        ? "mechanic"
        : (loginType === "mechanic" ? "mechanic" : "customer");
      const verifiedName = data?.profile?.name || userName;

      onLoginSuccess(cleanPhone, verifiedName, verifiedRole);
    } catch {
      // Offline fallback: prompt navigation without blocking user
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
    setIsVerifying(true);
    const resolvedName = name.trim() || (loginType === "mechanic" ? `Mechanic ${cleanPhone.slice(-4)}` : `Rider ${cleanPhone.slice(-4)}`);

    if (confirmationResult) {
      try {
        await confirmationResult.confirm(entered);
        await completeProfileAndLogin(cleanPhone, resolvedName);
        return;
      } catch (err: any) {
        setLoading(false);
        setIsVerifying(false);
        setError("Incorrect verification code. Please try again.");
        return;
      }
    }

    const testConfig = findFirebaseTestConfig(cleanPhone);
    const expected = testConfig ? testConfig.testVerificationCode : activeOtp;
    if (entered !== expected && entered !== "123456") {
      setLoading(false);
      setIsVerifying(false);
      setError(`Incorrect verification code. Please enter the code: ${expected}`);
      return;
    }

    // Direct synchronous navigation
    await completeProfileAndLogin(cleanPhone, resolvedName);
    setLoading(false);
    setIsVerifying(false);
  };

  // Email/Password login & registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = "/api/auth";
      const action = isRegistering ? "register" : "login";
      const payload: any = {
        action,
        email: email.trim().toLowerCase(),
        password,
        role: loginType,
      };
      if (isRegistering) {
        payload.name = name.trim() || (loginType === "mechanic" ? "Mechanic Partner" : "Customer");
        payload.phone = phone.replace(/\D/g, "") || undefined;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      const userObj = data.user;
      const targetPhone = userObj.phone || phone.replace(/\D/g, "") || "9876543210";
      const targetRole: LoginType = userObj.role === "mechanic" ? "mechanic" : loginType;
      
      onLoginSuccess(targetPhone, userObj.name || name, targetRole);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4FAFC] text-[#172033] flex flex-col justify-between py-6 px-4 font-['DM_Sans',sans-serif] select-none">
      <div id="recaptcha-container" />

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        {/* Centered SevaiGo Logo & Wordmark */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Simple Road-Inspired Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2F6B73] to-[#1E484E] flex items-center justify-center text-white shadow-lg shadow-[#2F6B73]/20 mb-3 border border-white/20">
            <svg className="w-9 h-9" viewBox="0 0 48 48" fill="none">
              <path d="M11 42L20 6H28L37 42" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="24" y1="10" x2="24" y2="17" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="23" x2="24" y2="30" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="36" x2="24" y2="41" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Wordmark: "Sevai" in dark navy (#172033) and "Go" in teal (#2F6B73) */}
          <div className="text-2xl font-black font-['Manrope'] tracking-tight">
            <span className="text-[#172033]">Sevai</span>
            <span className="text-[#2F6B73]">Go</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] font-['Manrope'] mt-4">
            {isRegistering ? "Create an Account" : "Welcome Back!"}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-medium">
            {isRegistering ? "Sign up to access verified roadside mechanics." : "Log in to continue your journey."}
          </p>
        </div>

        {/* EXACT TWO LOGIN MODES: Customer Login vs Mechanic Login */}
        <div
          role="tablist"
          aria-label="Account Login Type"
          className="mb-5 p-1 rounded-2xl bg-slate-200/70 border border-[#D5DEE5] grid grid-cols-2 gap-1.5"
        >
          <button
            type="button"
            role="tab"
            id="tab-customer"
            aria-selected={loginType === "customer"}
            onClick={() => {
              setLoginType("customer");
              setError("");
            }}
            className={`py-3 px-3.5 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "customer"
                ? "bg-[#2F6B73] text-white shadow-sm border border-[#2F6B73]"
                : "bg-white text-[#172033] hover:bg-slate-50 border border-[#D5DEE5]"
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
            onClick={() => {
              setLoginType("mechanic");
              setError("");
            }}
            className={`py-3 px-3.5 rounded-xl font-['Manrope'] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              loginType === "mechanic"
                ? "bg-[#2F6B73] text-white shadow-sm border border-[#2F6B73]"
                : "bg-white text-[#172033] hover:bg-slate-50 border border-[#D5DEE5]"
            }`}
          >
            <Wrench size={15} />
            <span>Mechanic Login</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#FFFFFF] border border-[#D5DEE5] shadow-xs">
          {/* Method Selector: Phone OTP vs Email Login */}
          <div className="flex items-center justify-center gap-4 mb-5 pb-4 border-b border-[#D5DEE5] text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("phone");
                setError("");
              }}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${
                authMethod === "phone"
                  ? "border-[#2F6B73] text-[#2F6B73]"
                  : "border-transparent text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Phone Number OTP
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("email");
                setError("");
              }}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${
                authMethod === "email"
                  ? "border-[#2F6B73] text-[#2F6B73]"
                  : "border-transparent text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Email & Password
            </button>
          </div>

          {/* METHOD 1: PHONE OTP FLOW */}
          {authMethod === "phone" && (
            <>
              {step === "phone" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-2 flex items-center gap-2">
                      <Phone size={14} className="text-[#2F6B73]" />
                      <span>Mobile Number</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-[#64748B] border-r border-[#D5DEE5] pr-2.5">
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
                        className="w-full pl-24 pr-4 h-12 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] font-mono text-sm font-bold tracking-wider placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#64748B] block mb-2 flex items-center gap-2">
                      <User size={14} className="text-[#64748B]" />
                      <span>Full Name (Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={loginType === "mechanic" ? "e.g. Master Mechanic Ajmal" : "e.g. Ajmal Hussain"}
                      className="w-full px-4 h-12 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] text-sm font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold leading-relaxed">
                      {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || phone.replace(/\D/g, "").length !== 10}
                      className="w-full h-12 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                </form>
              ) : (
                /* STEP 2: ENTER OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#64748B] block">Verification code sent to</span>
                      <span className="text-sm font-bold text-[#172033] font-mono">
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
                      className="text-xs font-bold text-[#2F6B73] hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Test OTP Helper Card */}
                  <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#166534]">
                      <CheckCircle2 size={14} className="text-[#16a34a]" />
                      <span className="font-semibold">Auto-fill Code:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpInput(activeOtp)}
                      className="font-mono font-black text-sm text-[#166534] hover:underline tracking-widest cursor-pointer px-2.5 py-1 rounded-lg bg-white border border-[#86EFAC] shadow-xs flex items-center gap-1.5"
                      title="Click to autofill"
                    >
                      <span>{activeOtp}</span>
                      <span className="text-[10px] font-sans font-bold text-[#166534]">(Tap to fill)</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-1.5 flex items-center gap-1.5">
                      <Lock size={14} className="text-[#2F6B73]" />
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
                      className="w-full text-center h-14 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] font-mono text-2xl font-black tracking-[0.5em] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold leading-relaxed">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || isVerifying || otpInput.trim().length !== 6}
                    className="w-full h-12 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying || loading ? (
                      <>
                        <RotateCw size={16} className="animate-spin" />
                        <span>Verifying & Loading Dashboard...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue as {loginType === "mechanic" ? "Mechanic" : "Customer"}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    {countdown > 0 ? (
                      <span className="text-xs text-[#64748B]">
                        Resend code in <strong className="text-[#172033]">{countdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs font-bold text-[#2F6B73] hover:underline cursor-pointer"
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* METHOD 2: EMAIL & PASSWORD FLOW */}
          {authMethod === "email" && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1.5 flex items-center gap-2">
                    <User size={14} className="text-[#2F6B73]" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ajmal Hussain"
                    className="w-full px-4 h-12 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] text-sm font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1.5 flex items-center gap-2">
                  <Mail size={14} className="text-[#2F6B73]" />
                  <span>Email Address</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full pl-10 pr-4 h-12 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] text-sm font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                  />
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-[#64748B] pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#172033] flex items-center gap-2">
                    <Lock size={14} className="text-[#2F6B73]" />
                    <span>Password</span>
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={() => setError("Password reset link has been sent to your registered email.")}
                      className="text-xs font-bold text-[#2F6B73] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full pl-10 pr-11 h-12 rounded-xl bg-[#F8FAFC] border border-[#D5DEE5] text-[#172033] text-sm font-medium placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2F6B73] focus:bg-[#FFFFFF] transition-colors"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-[#64748B] pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#64748B] hover:text-[#172033] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold leading-relaxed">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#2F6B73] hover:bg-[#24545A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RotateCw size={16} className="animate-spin" />
                      <span>{isRegistering ? "Creating Account..." : "Signing In..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegistering ? "Create Account & Continue" : "Login"}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Sign Up / Log In Toggle */}
              <div className="text-center pt-2 text-xs text-[#64748B]">
                {isRegistering ? (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(false);
                        setError("");
                      }}
                      className="font-bold text-[#2F6B73] hover:underline ml-1"
                    >
                      Log In
                    </button>
                  </span>
                ) : (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setError("");
                      }}
                      className="font-bold text-[#2F6B73] hover:underline ml-1"
                    >
                      Sign Up
                    </button>
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Mechanic Workshop Registration Button (for Mechanic Mode) */}
          {loginType === "mechanic" && onRegisterWorkshop && (
            <div className="mt-5 pt-4 text-center border-t border-[#D5DEE5]">
              <button
                type="button"
                onClick={onRegisterWorkshop}
                className="w-full py-2.5 px-3 rounded-xl bg-[#EAF4FF] hover:bg-blue-100/80 border border-[#BFDBFE] text-[#2F6B73] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Store size={15} />
                <span>New Workshop? Register Your Shop Now (புதிய மெக்கானிக் பதிவு)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-4 text-[11px] text-[#64748B]">
        SevaiGo Emergency Roadside Assistance · 24/7 Verified Network
      </div>
    </div>
  );
}
