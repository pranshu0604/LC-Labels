"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type LabelMode = "with-from" | "without-from";

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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative bg-black/30 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 rounded-2xl shadow-lg shadow-purple-500/25"
          >
            <div className="bg-slate-900 p-2 rounded-2xl">
              <Image src="/litchowk.png" alt="LitChowk Logo" width={50} height={50} className="rounded-xl" />
            </div>
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              LitChowk Label Editor
            </h1>
            <p className="text-purple-300/80 text-sm font-medium">Transform your data into printable labels</p>
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
              className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/10"
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-10"
              >
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                  Choose Label Type
                </h2>
                <p className="text-slate-400 text-lg">Select the format for your labels</p>
              </motion.div>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              >
                <motion.button
                  variants={scaleIn}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("with-from")}
                  className="group relative p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl hover:border-purple-400 hover:bg-purple-500/20 transition-colors overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all" />
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    className="text-6xl mb-5 relative z-10"
                  >
                    📦
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2 relative z-10">With &quot;From&quot; Field</h3>
                  <p className="text-slate-400 text-sm relative z-10">Name, Phone, Address, and Sender info</p>
                </motion.button>

                <motion.button
                  variants={scaleIn}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("without-from")}
                  className="group relative p-8 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-2 border-cyan-500/30 rounded-2xl hover:border-cyan-400 hover:bg-cyan-500/20 transition-colors overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 to-teal-600/0 group-hover:from-cyan-600/10 group-hover:to-teal-600/10 transition-all" />
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: -10 }}
                    className="text-6xl mb-5 relative z-10"
                  >
                    🏷️
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-2 relative z-10">Without &quot;From&quot; Field</h3>
                  <p className="text-slate-400 text-sm relative z-10">Name, Phone, and Address only</p>
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
              className="space-y-8"
            >
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ x: -4 }}
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Change label type</span>
              </motion.button>

              {/* Current Mode Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <span className="text-2xl">{mode === "with-from" ? "📦" : "🏷️"}</span>
                <span className="text-lg font-semibold text-white">
                  {mode === "with-from" ? "Labels with From field" : "Labels without From field"}
                </span>
              </motion.div>

              {/* Upload Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/10"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Upload Your Excel File
                  </h2>
                  <p className="text-slate-400">
                    We support .xls and .xlsx files with name, contact, and address columns
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  animate={isDragging ? { scale: 1.02, borderColor: "rgba(168, 85, 247, 0.8)" } : {}}
                  className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-purple-400 bg-purple-500/10"
                      : "border-white/20 hover:border-purple-400/50 hover:bg-white/5"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <motion.div
                    animate={isDragging ? { scale: 1.2, y: -10 } : { scale: 1, y: 0 }}
                    className="text-7xl mb-6"
                  >
                    {file ? "✅" : "📁"}
                  </motion.div>
                  <p className="text-xl font-semibold text-white mb-2">
                    {file ? file.name : "Drop your file here"}
                  </p>
                  {!file && <p className="text-slate-500 mb-6">or</p>}
                  <label className="cursor-pointer">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-bold rounded-full shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
                    >
                      {file ? "Choose Different File" : "Choose File"}
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
                    className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10"
                  >
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6 text-center">
                      Configure Your Labels
                    </h3>

                    {/* Worksheet Selection */}
                    <div className="mb-6">
                      <label className="block text-slate-300 font-semibold mb-2">Select Worksheet</label>
                      <select
                        value={selectedWorksheet}
                        onChange={(e) => setSelectedWorksheet(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-medium appearance-none cursor-pointer"
                      >
                        {worksheets.map((ws) => (
                          <option key={ws} value={ws} className="bg-slate-800">
                            {ws}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Row Range Selection */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-3">Row Range</label>
                      <div className="flex items-center gap-6 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="rowRange"
                            checked={rowRangeType === "all"}
                            onChange={() => setRowRangeType("all")}
                            className="w-5 h-5 accent-purple-500"
                          />
                          <span className="text-slate-300 group-hover:text-white transition-colors">All Rows</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="rowRange"
                            checked={rowRangeType === "range"}
                            onChange={() => setRowRangeType("range")}
                            className="w-5 h-5 accent-purple-500"
                          />
                          <span className="text-slate-300 group-hover:text-white transition-colors">Specify Range</span>
                        </label>
                      </div>

                      <AnimatePresence>
                        {rowRangeType === "range" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-4 overflow-hidden"
                          >
                            <div className="flex-1">
                              <label className="block text-sm text-slate-400 mb-1">Start Row</label>
                              <input
                                type="number"
                                min="1"
                                value={startRow}
                                onChange={(e) => setStartRow(e.target.value)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                placeholder="1"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm text-slate-400 mb-1">End Row (optional)</label>
                              <input
                                type="number"
                                min="1"
                                value={endRow}
                                onChange={(e) => setEndRow(e.target.value)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                                placeholder="Leave empty for all"
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="relative px-12 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white text-xl font-bold rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-emerald-500/25 transition-all overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {loading ? (
                      <>
                        <motion.svg
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-6 w-6"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </motion.svg>
                        Generating...
                      </>
                    ) : (
                      "Generate Labels"
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>

                <AnimatePresence>
                  {downloadUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl px-8 py-5 backdrop-blur-xl"
                    >
                      <p className="text-emerald-300 font-semibold text-lg text-center flex items-center gap-3">
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                        >
                          🎉
                        </motion.span>
                        Your labels are ready!{" "}
                        <a
                          className="underline hover:text-white font-bold transition-colors"
                          href={downloadUrl}
                          download
                        >
                          Download Now
                        </a>
                      </p>
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
        className="relative bg-black/30 backdrop-blur-xl border-t border-white/10 mt-auto"
      >
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-md opacity-50" />
              <Image
                src="/pran.png"
                alt="Pranshu Pandey"
                width={50}
                height={50}
                className="relative rounded-full border-2 border-white/20 shadow-xl"
              />
            </motion.div>
            <div>
              <p className="text-purple-400/80 text-sm font-medium">Made with mohabbat by</p>
              <p className="font-semibold text-lg bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Shri Shri 1008 Pranshu Pandey Ji
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-500">© 2025 LitChowk. All rights reserved.</div>
        </div>
      </motion.footer>
    </div>
  );
}
