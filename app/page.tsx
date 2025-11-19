"use client";

import React, { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>("");
  const [rowRangeType, setRowRangeType] = useState<"all" | "range">("all");
  const [startRow, setStartRow] = useState<string>("1");
  const [endRow, setEndRow] = useState<string>("");

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      await extractWorksheets(f);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    setFile(f);
    if (f) {
      await extractWorksheets(f);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
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
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "x-filename": file.name,
        "x-worksheet": selectedWorksheet,
        "x-row-range-type": rowRangeType,
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
      alert("Failed to generate labels: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Decorative background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-lg">
            <Image src="/litchowk.png" alt="LitChowk Logo" width={60} height={60} className="rounded-xl" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-white drop-shadow-lg">LitChowk Label Editor</h1>
            <p className="text-white/90 text-sm font-medium">✨ Transform your data into beautiful printable labels</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        {/* Upload Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-10 border-4 border-purple-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
              Upload Your Excel File
            </h2>
            <p className="text-gray-600">We support .xls and .xlsx files with name, contact, address, and from columns</p>
          </div>
          
          <div
            className="relative border-4 border-dashed border-purple-300 rounded-2xl p-16 flex flex-col items-center justify-center hover:border-pink-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">📁</div>
            <p className="text-2xl font-bold text-gray-800 mb-2">Drop your file here</p>
            <p className="text-gray-500 mb-6">or</p>
            <label className="cursor-pointer">
              <span className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all">
                Choose File
              </span>
              <input type="file" accept=".xls,.xlsx" onChange={handleFileInput} className="hidden" />
            </label>
            {file && (
              <div className="mt-6 px-6 py-3 bg-green-100 text-green-800 rounded-full font-bold shadow-lg">
                ✓ {file.name}
              </div>
            )}
          </div>
        </div>

        {/* Worksheet & Row Range Selection */}
        {file && worksheets.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-10 border-4 border-blue-200">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600 mb-6 text-center">
              Configure Your Labels
            </h3>
            
            {/* Worksheet Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2">Select Worksheet</label>
              <select
                value={selectedWorksheet}
                onChange={(e) => setSelectedWorksheet(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200 font-medium"
              >
                {worksheets.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </div>

            {/* Row Range Selection */}
            <div>
              <label className="block text-gray-700 font-bold mb-2">Row Range</label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rowRange"
                    checked={rowRangeType === "all"}
                    onChange={() => setRowRangeType("all")}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-medium text-gray-700">All Rows</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rowRange"
                    checked={rowRangeType === "range"}
                    onChange={() => setRowRangeType("range")}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-medium text-gray-700">Specify Range</span>
                </label>
              </div>

              {rowRangeType === "range" && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Start Row</label>
                    <input
                      type="number"
                      min="1"
                      value={startRow}
                      onChange={(e) => setStartRow(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200"
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">End Row (optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={endRow}
                      onChange={(e) => setEndRow(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-200"
                      placeholder="Leave empty for all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="relative px-12 py-5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white text-xl font-black rounded-full shadow-2xl hover:shadow-green-500/50 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Magic...
              </span>
            ) : (
              "🚀 Generate Labels"
            )}
          </button>
          {downloadUrl && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-4 border-green-400 rounded-2xl px-8 py-4 shadow-xl">
              <p className="text-green-800 font-bold text-lg text-center">
                🎉 Your labels are ready!{" "}
                <a className="underline hover:text-green-600 font-black" href={downloadUrl} download>
                  Download Now
                </a>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 text-white mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-md opacity-75"></div>
              <Image src="/pran.png" alt="Pranshu Pandey" width={60} height={60} className="relative rounded-full border-4 border-white shadow-xl" />
            </div>
            <div>
              <p className="text-pink-300 text-sm font-medium">Made with mohabbat by</p>
              <p className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
                Shri Shri 1008 Pranshu Pandey Ji
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-400">© 2025 LitChowk. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
