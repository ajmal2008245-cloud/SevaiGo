"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (phone: string, name?: string) => void;
  onContinueAsGuest?: () => void;
}

export default function LoginView({
  onLoginSuccess,
  onContinueAsGuest,
}: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("123456");
  const [useOtpMode, setUseOtpMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (useOtpMode && otp.trim() !== "123456" && otp.length !== 6) {
      setError("Invalid OTP. For demonstration, use 123456.");
      return;
    }

    if (!useOtpMode && password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(cleanPhone, name.trim() || undefined);
    }, 450);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess("9876543210", "Nivash K");
    }, 400);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#07090C] text-white flex flex-col justify-between overflow-x-hidden select-none font-['DM_Sans',sans-serif]">
      {/* Top Motorcycle Studio Banner */}
      <div className="relative w-full h-[240px] md:h-[280px] overflow-hidden">
        {/* Background dark studio motorcycle */}
        <div
          className="absolute inset-0 bg-cover bg-center filter brightness-[0.7] contrast-[1.15]"
          style={{ backgroundImage: "url('/images/login-motorcycle.jpg')" }}
        />
        {/* Cinematic gradient fade from bottom & sides */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090C] via-[#07090C]/50 to-[#07090C]/80 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#FF7900]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Back / Guest Navigation */}
        <div className="relative z-10 p-5 flex items-center justify-between">
          {onContinueAsGuest && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[#A5ADB8] hover:text-white backdrop-blur-md transition-colors cursor-pointer"
              title="Continue as Guest"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-[11px] font-semibold text-[#FF7900] bg-[#FF7900]/10 px-3 py-1 rounded-full border border-[#FF7900]/25 backdrop-blur-sm ml-auto">
            Secure Rider Gateway
          </span>
        </div>

        {/* Brand Emblem on top banner */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-center z-10 w-full px-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7900] to-[#ea580c] p-0.5 shadow-[0_8px_20px_rgba(255,121,0,0.45)] mb-1.5">
            <div className="w-full h-full rounded-[14px] bg-[#0D1117] flex items-center justify-center">
              <Bike size={28} className="text-[#FF7900]" strokeWidth={2.4} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white font-['Manrope'] tracking-tight">
            Sevai<span className="text-[#FF7900]">Go</span>
          </h2>
          <p className="text-[11px] font-semibold tracking-wider text-[#A5ADB8] uppercase">
            Your Bike, Our Priority
          </p>
        </div>
      </div>

      {/* Main Login / Signup Card */}
      <div className="relative z-20 w-full max-w-md mx-auto px-5 py-3 -mt-2 flex-1 flex flex-col justify-center">
        <div className="mb-5 text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-['Manrope'] mb-1">
            {isSignUp ? "Create Your Account" : "Welcome Back!"}
          </h1>
          <p className="text-xs md:text-sm text-[#A5ADB8]">
            {isSignUp
              ? "Join the premier network for precision motorcycle care."
              : "Log in to keep your ride running smooth."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Sign Up: Name Field */}
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A5ADB8] mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center rounded-xl bg-[#121820] border border-[#1F2733] focus-within:border-[#FF7900] transition-colors">
                <span className="pl-3.5 text-[#A5ADB8]">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nivash K"
                  className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-[#505a69] outline-none"
                />
              </div>
            </div>
          )}

          {/* Mobile Number Field */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A5ADB8] mb-1.5">
              Mobile Number
            </label>
            <div className="relative flex items-center rounded-xl bg-[#121820] border border-[#1F2733] focus-within:border-[#FF7900] transition-colors overflow-hidden">
              <span className="px-3.5 py-3 bg-[#0D1117] border-r border-[#1F2733] text-xs font-bold text-[#FF7900]">
                +91
              </span>
              <span className="pl-3 text-[#A5ADB8]">
                <Phone size={17} />
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 10-digit number"
                className="w-full bg-transparent px-3 py-3 text-sm font-semibold tracking-wide text-white placeholder-[#505a69] outline-none"
              />
            </div>
          </div>

          {/* Sign Up: Email Field */}
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A5ADB8] mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center rounded-xl bg-[#121820] border border-[#1F2733] focus-within:border-[#FF7900] transition-colors">
                <span className="pl-3.5 text-[#A5ADB8]">
                  <User size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nivash@example.com"
                  className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-[#505a69] outline-none"
                />
              </div>
            </div>
          )}

          {/* Password or OTP Field */}
          {!useOtpMode ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#A5ADB8]">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setUseOtpMode(true)}
                    className="text-[11px] font-bold text-[#FF7900] hover:underline cursor-pointer"
                  >
                    Use Mock OTP instead
                  </button>
                )}
              </div>
              <div className="relative flex items-center rounded-xl bg-[#121820] border border-[#1F2733] focus-within:border-[#FF7900] transition-colors">
                <span className="pl-3.5 text-[#A5ADB8]">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-[#505a69] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3.5 text-[#A5ADB8] hover:text-white transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isSignUp && (
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => alert("Password reset instructions have been sent to your registered mobile.")}
                    className="text-xs text-[#A5ADB8] hover:text-[#FF7900] transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#A5ADB8]">
                  One-Time Password (OTP)
                </label>
                <span className="text-[10px] font-bold text-[#FF7900] bg-[#FF7900]/10 px-2 py-0.5 rounded border border-[#FF7900]/20">
                  Demo OTP: 123456
                </span>
              </div>
              <div className="relative flex items-center rounded-xl bg-[#121820] border border-[#1F2733] focus-within:border-[#FF7900] transition-colors">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-transparent px-4 py-3 text-center text-lg font-bold tracking-[0.25em] text-white outline-none"
                />
              </div>
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => setUseOtpMode(false)}
                  className="text-xs text-[#A5ADB8] hover:text-white cursor-pointer"
                >
                  Use Password instead
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF7900] to-[#ea580c] hover:brightness-110 active:scale-95 text-white font-extrabold text-sm tracking-wider uppercase shadow-[0_8px_25px_rgba(255,121,0,0.4)] transition-all duration-200 cursor-pointer mt-1"
          >
            {loading ? "Verifying..." : isSignUp ? "Create Account" : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1F2733]" />
          </div>
          <span className="relative bg-[#07090C] px-3 text-[11px] font-bold uppercase tracking-wider text-[#505a69]">
            OR
          </span>
        </div>

        {/* Social / Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-[#121820] hover:bg-[#18202A] border border-[#1F2733] text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          {/* Google G SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.4 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.6 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Toggle Mode: Sign In vs Sign Up */}
        <div className="mt-5 text-center text-xs text-[#A5ADB8]">
          {isSignUp ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError("");
                }}
                className="font-bold text-[#FF7900] hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError("");
                }}
                className="font-bold text-[#FF7900] hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Footer safe area */}
      <div className="p-4 text-center text-[11px] text-[#505a69]">
        © {new Date().getFullYear()} SevaiGo · Precision 3D Motorcycle Experience
      </div>
    </div>
  );
}
