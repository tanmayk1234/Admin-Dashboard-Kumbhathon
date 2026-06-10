"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import CollegePicker from "@/components/CollegePicker";
import CollegeDashboard from "@/components/CollegeDashboard";

interface DashboardData {
  totalInterns: number;
  todayCheckIns: number;
  currentlyInside: number;
  interns: string[][];
  attendance: string[][];
  internHeaders: string[];
  attendanceHeaders: string[];
}

type Screen = "login" | "picker" | "dashboard";

export default function AdminPage() {
  const shouldReduceMotion = useReducedMotion();

  const [screen, setScreen] = useState<Screen>("login");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("kumbhathon_admin_token");
      if (token) {
        setScreen("picker");
      }
    }
  }, []);

  // Fetch dashboard data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const token = sessionStorage.getItem("kumbhathon_admin_token") || "";
      const res = await fetch("/api/admin", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch on entering picker (if no data yet)
  useEffect(() => {
    if (screen !== "login" && !data) {
      fetchData();
    }
  }, [screen, data, fetchData]);

  // Auto-refresh every 30s when authenticated
  useEffect(() => {
    if (screen === "login") return;
    const id = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(id);
  }, [screen, fetchData]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      sessionStorage.setItem("kumbhathon_admin_token", password);
      setScreen("picker");
    } catch {
      toast.error("Incorrect password. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("kumbhathon_admin_token");
    setData(null);
    setSelectedCollege(null);
    setPassword("");
    setScreen("login");
  };

  const handleSelectCollege = (college: string) => {
    setSelectedCollege(college);
    setScreen("dashboard");
  };

  const handleBack = () => {
    setSelectedCollege(null);
    setScreen("picker");
  };

  return (
    <AnimatePresence mode="wait">
      {/* ─── Login ─────────────────────────────────────────────────────────── */}
      {screen === "login" && (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.35 }}
          className="min-h-screen bg-cream flex items-center justify-center px-6"
        >
          <div className="w-full max-w-sm">
            {/* Wordmark */}
            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-center text-muted-brown text-xs tracking-widest mb-10"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              KUMBHATHON
            </motion.p>

            {/* Lock icon */}
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
              className="flex justify-center mb-6"
            >
              <div className="w-16 h-16 rounded-full bg-warm-sand flex items-center justify-center">
                <Lock className="w-7 h-7 text-muted-brown" aria-hidden="true" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="text-4xl text-charcoal text-center mb-2"
              style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400 }}
            >
              Admin Access
            </motion.h1>

            <motion.p
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.26 }}
              className="text-center text-muted-brown text-sm mb-8"
            >
              Enter the admin password to continue
            </motion.p>

            {/* Form */}
            <motion.form
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              {/* Password field */}
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin password"
                  className="input-field pr-12"
                  autoFocus
                  aria-label="Admin password"
                  id="admin-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-brown/60 hover:text-muted-brown transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={!password || authLoading}
                className="btn-primary w-full"
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                id="admin-unlock-button"
              >
                {authLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  "Unlock Dashboard"
                )}
              </motion.button>
            </motion.form>
          </div>
        </motion.div>
      )}

      {/* ─── College Picker ─────────────────────────────────────────────────── */}
      {screen === "picker" && (
        <motion.div
          key="picker"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          {/* Skeleton while data loads */}
          {dataLoading && !data ? (
            <PickerSkeleton />
          ) : data ? (
            <CollegePicker
              interns={data.interns}
              onSelectCollege={handleSelectCollege}
              onLogout={handleLogout}
              onRefresh={() => fetchData()}
              lastUpdated={lastUpdated}
              loading={dataLoading}
            />
          ) : null}
        </motion.div>
      )}

      {/* ─── College Dashboard ──────────────────────────────────────────────── */}
      {screen === "dashboard" && data && selectedCollege && (
        <motion.div
          key={`dashboard-${selectedCollege}`}
          initial={shouldReduceMotion ? {} : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, x: 40 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
          <CollegeDashboard
            college={selectedCollege}
            interns={data.interns}
            attendance={data.attendance}
            onBack={handleBack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Picker skeleton while data loads ─────────────────────────────────────────

function PickerSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="border-b border-warm-sand bg-white/80 h-16" />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="skeleton w-64 h-10 mb-3" />
        <div className="skeleton w-40 h-4 mb-8" />
        <div className="skeleton w-56 h-11 mb-8 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
