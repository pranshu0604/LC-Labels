"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Coordinator {
  id: number;
  name: string;
  username: string;
  registrationNo: string;
}

interface Volunteer {
  id: number;
  name: string;
  registrationNo: string;
  uid: string | null;
  contactNo: string;
}

interface AttendanceRecord {
  id: number;
  sessionId: number;
  volunteerId: number;
  isPresent: boolean;
  markedAt: string | null;
  volunteer: Volunteer;
}

interface AttendanceSession {
  id: number;
  coordinatorId: number;
  sessionDateTime: string;
  createdAt: string;
  attendanceRecords: AttendanceRecord[];
}

export default function EventAttendanceDashboard() {
  const router = useRouter();
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if coordinator is logged in
    const coordinatorData = localStorage.getItem("coordinator");
    if (!coordinatorData) {
      router.push("/event-attendance");
      return;
    }
    const coord = JSON.parse(coordinatorData);
    setCoordinator(coord);

    // Load attendance sessions
    fetchAttendanceSessions(coord.id);
  }, [router]);

  async function fetchAttendanceSessions(coordinatorId: number) {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/event-attendance/sessions?coordinatorId=${coordinatorId}`);
      const data = await res.json();

      if (res.ok) {
        setAttendanceSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch attendance sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function createAttendanceSession() {
    if (!coordinator) return;

    setCreatingSession(true);
    try {
      const res = await fetch("/api/event-attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinatorId: coordinator.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      // Refresh sessions list
      await fetchAttendanceSessions(coordinator.id);

      // Open the newly created session
      setSelectedSession(data.session);
    } catch (err) {
      alert("Failed to create attendance session: " + (err as Error).message);
    } finally {
      setCreatingSession(false);
    }
  }

  async function updateAttendance(sessionId: number, volunteerIds: number[]) {
    try {
      const res = await fetch(`/api/event-attendance/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update attendance");
      }

      // Update the selected session
      setSelectedSession(data.session);

      // Refresh sessions list
      if (coordinator) {
        await fetchAttendanceSessions(coordinator.id);
      }
    } catch (err) {
      alert("Failed to update attendance: " + (err as Error).message);
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      await extractWorksheets(f);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    setFile(f);
    if (f) {
      await extractWorksheets(f);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function extractWorksheets(f: File) {
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets = wb.SheetNames;
      setWorksheets(sheets);
      setSelectedWorksheet(sheets[0] || "");
    } catch (err) {
      console.error("Failed to extract worksheets:", err);
    }
  }

  async function handleUpload() {
    if (!file || !coordinator) return;
    setLoading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("worksheet", selectedWorksheet);
      formData.append("coordinatorId", coordinator.id.toString());

      const res = await fetch("/api/event-attendance/volunteers/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadResult(data);
      setFile(null);
      setWorksheets([]);
      setSelectedWorksheet("");

      // Refresh volunteers list if needed
      // fetchVolunteers();
    } catch (err) {
      alert("Failed to upload volunteers: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("coordinator");
    router.push("/event-attendance");
  }

  if (!coordinator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(6,78,59,0.1),transparent_50%)]" />
      </div>

      {/* Floating particles */}
      {mounted && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-white/5 backdrop-blur-2xl border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">
              🎪
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Event Attendance Dashboard
              </h1>
              <p className="text-emerald-400/80 text-sm">
                Welcome, {coordinator.name}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="px-6 py-3 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Coordinator Info Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-lg font-bold text-white mb-4">Coordinator Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="text-white font-semibold">{coordinator.name}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Username</p>
                <p className="text-white font-semibold">{coordinator.username}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Registration No.</p>
                <p className="text-white font-semibold">{coordinator.registrationNo}</p>
              </div>
            </div>
          </motion.div>

          {/* Attendance Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Attendance Management
                </h2>
                <p className="text-gray-400 text-sm">
                  Create and manage attendance sessions
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createAttendanceSession}
                disabled={creatingSession}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {creatingSession ? (
                  <>
                    <motion.svg
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </motion.svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Attendance
                  </>
                )}
              </motion.button>
            </div>

            {/* Sessions List */}
            {loadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
                />
              </div>
            ) : attendanceSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No attendance sessions yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendanceSessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedSession(session)}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">
                          {new Date(session.sessionDateTime).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {session.attendanceRecords.filter(r => r.isPresent).length} / {session.attendanceRecords.length} present
                        </p>
                      </div>
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Selected Session Modal */}
          <AnimatePresence>
            {selectedSession && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
                onClick={() => setSelectedSession(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-900 rounded-3xl p-8 border border-emerald-500/30 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Mark Attendance</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(selectedSession.sessionDateTime).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedSession(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>

                  <AttendanceSelector
                    session={selectedSession}
                    onUpdate={(volunteerIds) => updateAttendance(selectedSession.id, volunteerIds)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Upload Volunteers
              </h2>
              <p className="text-gray-400 text-sm">
                Upload an Excel file with Name, Registration No., and Contact No. columns
              </p>
            </div>

            <motion.div
              whileHover={{ scale: file ? 1 : 1.01 }}
              animate={isDragging ? { scale: 1.02 } : {}}
              className={`relative rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : file
                  ? "border-emerald-400/50 bg-emerald-500/5"
                  : "border-white/20 hover:border-emerald-400/50 hover:bg-white/5"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <motion.div
                animate={isDragging ? { scale: 1.2, y: -10 } : { scale: 1, y: 0 }}
                className="mb-4"
              >
                {file ? (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/20">
                    ✓
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400/10 to-teal-500/10 border border-emerald-400/20 flex items-center justify-center text-4xl">
                    📁
                  </div>
                )}
              </motion.div>
              <p className="text-lg font-semibold text-white mb-1">
                {file ? file.name : "Drop your Excel file here"}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {file ? "File ready to process" : "or click to browse"}
              </p>
              <label className="cursor-pointer">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
                >
                  {file ? "Change File" : "Select File"}
                </motion.span>
                <input type="file" accept=".xls,.xlsx" onChange={handleFileInput} className="hidden" />
              </label>
            </motion.div>
          </motion.div>

          {/* Worksheet Selection */}
          <AnimatePresence>
            {file && worksheets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 overflow-hidden"
              >
                <h3 className="text-xl font-bold text-white mb-4">
                  Select Worksheet
                </h3>
                <div className="relative">
                  <select
                    value={selectedWorksheet}
                    onChange={(e) => setSelectedWorksheet(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer appearance-none transition-all"
                  >
                    {worksheets.map((ws) => (
                      <option key={ws} value={ws} className="bg-slate-900">
                        {ws}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Button */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  disabled={loading}
                  className="relative px-12 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 flex items-center gap-3">
                    {loading ? (
                      <>
                        <motion.svg
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </motion.svg>
                        Uploading Volunteers...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Volunteers
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Results */}
          <AnimatePresence>
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-bold text-lg">Upload Complete!</p>
                    <p className="text-gray-400 text-sm">Volunteers have been processed</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold text-emerald-400">{uploadResult.added?.length || 0}</p>
                    <p className="text-sm text-gray-400">Added</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold text-yellow-400">{uploadResult.duplicates?.length || 0}</p>
                    <p className="text-sm text-gray-400">Duplicates</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold text-red-400">{uploadResult.errors?.length || 0}</p>
                    <p className="text-sm text-gray-400">Errors</p>
                  </div>
                </div>

                {uploadResult.duplicates && uploadResult.duplicates.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-sm text-yellow-400 font-semibold mb-2">Duplicate Records Found:</p>
                    <ul className="text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.duplicates.map((dup: any, idx: number) => (
                        <li key={idx}>
                          {dup.new.name} (Reg: {dup.new.registration_no})
                          {dup.existing.uid && <span className="text-emerald-400 ml-2">UID: {dup.existing.uid}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400 font-semibold mb-2">Errors:</p>
                    <ul className="text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((err: any, idx: number) => (
                        <li key={idx}>
                          {err.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

// Attendance Selector Component
function AttendanceSelector({
  session,
  onUpdate,
}: {
  session: AttendanceSession;
  onUpdate: (volunteerIds: number[]) => void;
}) {
  const [selectedVolunteers, setSelectedVolunteers] = useState<number[]>(
    session.attendanceRecords.filter(r => r.isPresent).map(r => r.volunteerId)
  );
  const [saving, setSaving] = useState(false);

  function toggleVolunteer(volunteerId: number) {
    setSelectedVolunteers(prev =>
      prev.includes(volunteerId)
        ? prev.filter(id => id !== volunteerId)
        : [...prev, volunteerId]
    );
  }

  async function handleSave() {
    setSaving(true);
    await onUpdate(selectedVolunteers);
    setSaving(false);
  }

  // Get unique volunteers (in case of any data issues)
  const uniqueRecords = session.attendanceRecords.filter((record, index, self) =>
    index === self.findIndex((r) => r.volunteerId === record.volunteerId)
  );

  return (
    <div className="space-y-4">
      {uniqueRecords.length < session.attendanceRecords.length && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-xs text-yellow-400">
            Note: Duplicate volunteers were detected and filtered out.
          </p>
        </div>
      )}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {uniqueRecords.map((record) => (
          <motion.div
            key={record.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleVolunteer(record.volunteerId)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedVolunteers.includes(record.volunteerId)
                ? 'border-emerald-500 bg-emerald-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{record.volunteer.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-400">{record.volunteer.registrationNo}</p>
                  {record.volunteer.uid && (
                    <>
                      <span className="text-gray-600">•</span>
                      <p className="text-sm text-emerald-400 font-medium">UID: {record.volunteer.uid}</p>
                    </>
                  )}
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedVolunteers.includes(record.volunteerId)
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-white/30'
              }`}>
                {selectedVolunteers.includes(record.volunteerId) && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </motion.svg>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <p className="text-gray-400 text-sm">
          {selectedVolunteers.length} / {uniqueRecords.length} volunteers selected
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </motion.svg>
              Saving...
            </span>
          ) : (
            'Save Attendance'
          )}
        </motion.button>
      </div>
    </div>
  );
}
