"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Toaster } from "sonner";

interface Person {
  id: number;
  uid: string;
  name: string;
  registration_no: string;
  contact_no: string;
}

interface AttendanceRecord extends Person {
  attendance_id: number;
  date: string;
}

export default function DayAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    fetchAttendance();
    fetchAllPeople();
  }, [date]);

  async function fetchAttendance() {
    try {
      const res = await fetch(`/api/attendance/records?date=${date}`);
      const data = await res.json();
      setAttendance(data.attendance || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllPeople() {
    try {
      const res = await fetch("/api/attendance/people");
      const data = await res.json();
      setAllPeople(data.people || []);
    } catch (error) {
      console.error("Error fetching people:", error);
    }
  }

  async function handleAddAttendance() {
    if (selectedPeople.length === 0) return;

    try {
      const res = await fetch("/api/attendance/records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_ids: selectedPeople,
          date,
        }),
      });

      const data = await res.json();

      if (data.added.length > 0) {
        await fetchAttendance();
        setShowAddDialog(false);
        setSelectedPeople([]);
        setSearch("");
        toast.success(`Marked ${data.added.length} ${data.added.length === 1 ? 'person' : 'people'} as present`);
      }
    } catch (error) {
      console.error("Error adding attendance:", error);
      toast.error("Failed to add attendance");
    }
  }

  async function handleRemoveAttendance(attendanceId: number) {
    setConfirmDialog({
      show: true,
      title: "Remove Attendance",
      message: "Are you sure you want to remove this attendance record?",
      onConfirm: async () => {
        // Optimistic update: remove from UI immediately
        setAttendance(prev => prev.filter(a => a.attendance_id !== attendanceId));

        try {
          const res = await fetch(`/api/attendance/records?id=${attendanceId}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            throw new Error("Failed to delete attendance");
          }
          toast.success("Attendance record removed");
        } catch (error) {
          console.error("Error removing attendance:", error);
          toast.error("Failed to remove attendance");
          // Revert optimistic update by refetching
          await fetchAttendance();
        }
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  }

  const attendedIds = new Set(attendance.map((a) => a.id));
  const availablePeople = allPeople
    .filter((p) => !attendedIds.has(p.id))
    .filter((p) =>
      search
        ? p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.registration_no.toLowerCase().includes(search.toLowerCase()) ||
          p.uid.toLowerCase().includes(search.toLowerCase())
        : true
    );

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
            <motion.button
              whileHover={{ x: -4 }}
              onClick={() => router.push("/attendance")}
              className="text-cyan-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-white">Attendance - {formattedDate}</h1>
              <p className="text-cyan-400/80 text-sm">{attendance.length} people present</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddDialog(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg"
          >
            + Mark Attendance
          </motion.button>
        </div>
      </motion.header>

      <main className="relative flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="text-center text-white py-20">Loading...</div>
        ) : attendance.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center">
            <p className="text-gray-400 text-lg mb-4">No attendance recorded for this day</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowAddDialog(true)}
              className="px-6 py-3 bg-cyan-500 text-white rounded-xl"
            >
              Mark Attendance
            </motion.button>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Present Today</h2>
            <div className="space-y-3">
              {attendance.map((record) => (
                <motion.div
                  key={record.attendance_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">{record.name}</p>
                    <p className="text-gray-400 text-sm">
                      {record.uid} • {record.registration_no} • {record.contact_no || "N/A"}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemoveAttendance(record.attendance_id)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Attendance Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl p-8 border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Mark Attendance</h3>

            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
            />

            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
              {availablePeople.map((person) => (
                <label
                  key={person.id}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                    selectedPeople.includes(person.id)
                      ? "bg-cyan-500/20 border-2 border-cyan-500"
                      : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPeople.includes(person.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPeople([...selectedPeople, person.id]);
                      } else {
                        setSelectedPeople(selectedPeople.filter((id) => id !== person.id));
                      }
                    }}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="text-white font-semibold">{person.name}</p>
                    <p className="text-gray-400 text-sm">
                      {person.uid} • {person.registration_no} • {person.contact_no || "N/A"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowAddDialog(false);
                  setSelectedPeople([]);
                  setSearch("");
                }}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddAttendance}
                disabled={selectedPeople.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                Mark {selectedPeople.length} {selectedPeople.length === 1 ? "Person" : "People"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl p-8 border border-white/10 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">{confirmDialog.title}</h3>
            <p className="text-gray-400 mb-6">{confirmDialog.message}</p>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: () => {} })}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl"
              >
                Remove
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
