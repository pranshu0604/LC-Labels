"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type LabelMode = "with-from" | "without-from" | "name-designation-address-phone";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export default function Home() {
  const [mode, setMode] = useState<LabelMode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>("");
  const [rowRangeType, setRowRangeType] = useState<"all" | "range">("all");
  const [startRow, setStartRow] = useState<string>("1");
  const [endRow, setEndRow] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch by only rendering random particles on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  function handleBack() {
    setMode(null);
    setFile(null);
    setWorksheets([]);
    setSelectedWorksheet("");
    setDownloadUrl(null);
    setRowRangeType("all");
    setStartRow("1");
    setEndRow("");
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "x-filename": file.name,
        "x-worksheet": selectedWorksheet,
        "x-row-range-type": rowRangeType,
        "x-label-mode": mode || "with-from",
      };
      if (rowRangeType === "range") {
        headers["x-start-row"] = startRow;
        if (endRow) headers["x-end-row"] = endRow;
      }
      const res = await fetch("/api/labels", {
        method: "POST",
        headers,
        body: buf,
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") || `labels.xlsx`;
      const m = cd.match(/filename="?([^";]+)"?/);
      const fname = m ? m[1] : `labels.xlsx`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to generate labels: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]" />
      </div>

      {/* Floating particles */}
      {mounted && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
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
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl blur-xl opacity-60" />
            <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-2xl shadow-2xl">
              <Image src="/litchowk.png" alt="LitChowk Logo" width={40} height={40} className="relative z-10" />
            </div>
          </motion.div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              LitChowk Labels
            </h1>
            <p className="text-cyan-400/80 text-sm">Excel → Printable Labels</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
            />
            <span className="text-sm text-emerald-400 font-medium">Ready</span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Mode Selection */}
          {!mode && (
            <motion.div
              key="mode-selection"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-white mb-3"
                >
                  Choose Your Label Type
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-gray-400"
                >
                  Select the format that matches your needs
                </motion.p>
              </div>

              {/* Attendance System Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center"
              >
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = "/attendance"}
                  className="group relative bg-gradient-to-br from-orange-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-6 border border-orange-500/20 hover:border-orange-400/50 transition-all overflow-hidden w-full max-w-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-pink-500/0 group-hover:from-orange-500/20 group-hover:to-pink-500/20 transition-all duration-500" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                      📋
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white mb-1">Attendance System</h3>
                      <p className="text-sm text-gray-400">Manage attendance records</p>
                    </div>
                    <div className="ml-auto text-orange-400 group-hover:translate-x-1 transition-transform">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.button>
              </motion.div>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 md:grid-cols-3 gap-5"
              >
                <motion.button
                  variants={scaleIn}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("with-from")}
                  className="group relative bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl rounded-3xl p-8 border border-emerald-500/20 hover:border-emerald-400/50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 transition-all duration-500" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                      📦
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">With From Field</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Name, Phone, Address + Sender Information</p>
                  </div>
                </motion.button>

                <motion.button
                  variants={scaleIn}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("without-from")}
                  className="group relative bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-8 border border-cyan-500/20 hover:border-cyan-400/50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-500" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                      🏷️
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Without From Field</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Name, Phone, and Address only</p>
                  </div>
                </motion.button>

                <motion.button
                  variants={scaleIn}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("name-designation-address-phone")}
                  className="group relative bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-8 border border-violet-500/20 hover:border-violet-400/50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
                  <div className="relative z-10">
                    <div className="w-16 h-16 mb-4 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                      👤
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Name + Designation</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">Name, Designation, Address, Phone</p>
                  </div>
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* Upload and Configure Section */}
          {mode && (
            <motion.div
              key="upload-section"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -4, scale: 1.05 }}
                onClick={handleBack}
                className="flex items-center gap-2 text-cyan-400 hover:text-white transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Change label type</span>
              </motion.button>

              {/* Current Mode Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                      mode === "with-from"
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                        : mode === "name-designation-address-phone"
                        ? "bg-gradient-to-br from-violet-400 to-purple-500"
                        : "bg-gradient-to-br from-cyan-400 to-blue-500"
                    } shadow-lg`}>
                      {mode === "with-from" ? "📦" : mode === "name-designation-address-phone" ? "👤" : "🏷️"}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Selected Mode</div>
                      <span className="text-base font-bold text-white">
                        {mode === "with-from"
                          ? "With From Field"
                          : mode === "name-designation-address-phone"
                          ? "Name + Designation"
                          : "Without From Field"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-emerald-400 rounded-full"
                    />
                    <span className="text-sm text-emerald-400">Active</span>
                  </div>
                </div>
              </motion.div>

              {/* Upload Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Upload Excel File
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {mode === "name-designation-address-phone"
                      ? "Support for .xls and .xlsx files with Name, Designation, Address, and Phone columns"
                      : "Support for .xls and .xlsx files with Name, Contact, and Address columns"}
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: file ? 1 : 1.01 }}
                  animate={isDragging ? { scale: 1.02 } : {}}
                  className={`relative rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-cyan-400 bg-cyan-500/10"
                      : file
                      ? "border-emerald-400/50 bg-emerald-500/5"
                      : "border-white/20 hover:border-cyan-400/50 hover:bg-white/5"
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
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border border-cyan-400/20 flex items-center justify-center text-4xl">
                        📁
                      </div>
                    )}
                  </motion.div>
                  <p className="text-lg font-semibold text-white mb-1">
                    {file ? file.name : "Drop your file here"}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {file ? "File ready to process" : "or click to browse"}
                  </p>
                  <label className="cursor-pointer">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                    >
                      {file ? "Change File" : "Select File"}
                    </motion.span>
                    <input type="file" accept=".xls,.xlsx" onChange={handleFileInput} className="hidden" />
                  </label>
                </motion.div>
              </motion.div>

              {/* Worksheet & Row Range Selection */}
              <AnimatePresence>
                {file && worksheets.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 overflow-hidden"
                  >
                    <h3 className="text-2xl font-bold text-white mb-6">
                      Configuration
                    </h3>

                    {/* Worksheet Selection */}
                    <div className="mb-6">
                      <label className="block text-gray-400 text-sm mb-2 font-medium">
                        Select Worksheet
                      </label>
                      <div className="relative">
                        <select
                          value={selectedWorksheet}
                          onChange={(e) => setSelectedWorksheet(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer appearance-none transition-all"
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
                    </div>

                    {/* Row Range Selection */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-3 font-medium">
                        Row Range
                      </label>
                      <div className="flex items-center gap-6 mb-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            rowRangeType === "all"
                              ? "border-cyan-500 bg-cyan-500"
                              : "border-white/30 group-hover:border-white/50"
                          }`}>
                            {rowRangeType === "all" && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="text-white text-sm group-hover:text-cyan-400 transition-colors">All Rows</span>
                          <input
                            type="radio"
                            name="rowRange"
                            checked={rowRangeType === "all"}
                            onChange={() => setRowRangeType("all")}
                            className="hidden"
                          />
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            rowRangeType === "range"
                              ? "border-cyan-500 bg-cyan-500"
                              : "border-white/30 group-hover:border-white/50"
                          }`}>
                            {rowRangeType === "range" && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="text-white text-sm group-hover:text-cyan-400 transition-colors">Custom Range</span>
                          <input
                            type="radio"
                            name="rowRange"
                            checked={rowRangeType === "range"}
                            onChange={() => setRowRangeType("range")}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <AnimatePresence>
                        {rowRangeType === "range" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 gap-4 overflow-hidden"
                          >
                            <div>
                              <label className="block text-xs text-gray-500 mb-2">Start Row</label>
                              <input
                                type="number"
                                min="1"
                                value={startRow}
                                onChange={(e) => setStartRow(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                placeholder="1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-2">End Row (optional)</label>
                              <input
                                type="number"
                                min="1"
                                value={endRow}
                                onChange={(e) => setEndRow(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                placeholder="Leave empty"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-6 pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="relative px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        Generating Labels...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate Labels
                      </>
                    )}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {downloadUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      className="w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
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
                            <p className="text-emerald-400 font-bold text-lg">Labels Generated!</p>
                            <p className="text-gray-400 text-sm">Your file is ready to download</p>
                          </div>
                        </div>
                        <a href={downloadUrl} download>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </motion.div>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative bg-white/5 backdrop-blur-xl border-t border-white/10 mt-auto"
      >
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-lg opacity-50" />
              <Image
                src="/pran.png"
                alt="Pranshu Pandey"
                width={48}
                height={48}
                className="relative rounded-full ring-2 ring-white/20"
              />
            </motion.div>
            <div>
              <p className="text-gray-500 text-xs">Crafted with passion by</p>
              <p className="font-semibold text-white">
                Pranshu Pandey
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            © 2025 LitChowk Labels
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
