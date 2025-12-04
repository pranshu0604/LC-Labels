"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Toaster } from "sonner";
import CalendarView from "./components/CalendarView";
import PeopleManagement from "./components/PeopleManagement";

export default function AttendancePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/attendance/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem("attendance_auth", "true");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = sessionStorage.getItem("attendance_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <Toaster position="top-center" richColors />
        <div className="fixed inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]" />
        </div>

        <div className="relative flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl blur-xl opacity-60" />
                    <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-2xl">
                      <Image src="/litchowk.png" alt="LitChowk" width={48} height={48} />
                    </div>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Attendance System
                </h1>
                <p className="text-gray-400 text-sm">Enter admin password to continue</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin Password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || !password}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Access System"}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push("/")}
                  className="text-cyan-400 text-sm hover:text-white transition-colors"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return <AttendanceMain />;
}

function AttendanceMain() {
  const [activeTab, setActiveTab] = useState<"calendar" | "people">("calendar");

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <Toaster position="top-center" richColors />
      <div className="fixed inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]" />
      </div>

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white/5 backdrop-blur-2xl border-b border-white/10 z-10"
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl blur-xl opacity-60" />
              <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-2xl">
                <Image src="/litchowk.png" alt="LitChowk" width={40} height={40} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Attendance System</h1>
              <p className="text-cyan-400/80 text-sm">Manage attendance records</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sessionStorage.removeItem("attendance_auth");
                window.location.href = "/";
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors text-sm"
            >
              Logout
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="relative flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="flex gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("calendar")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "calendar"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            📅 Calendar View
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("people")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === "people"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            👥 People Management
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "calendar" ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CalendarView />
            </motion.div>
          ) : (
            <motion.div
              key="people"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PeopleManagement />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

