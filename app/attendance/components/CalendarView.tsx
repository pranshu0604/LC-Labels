"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const START_DATE = new Date(2025, 7, 27); // August 27, 2025 (month is 0-indexed)
const END_DATE = new Date(2025, 11, 21); // December 21, 2025

export default function CalendarView() {
  // Get current month (or use August if before August 2025)
  const getCurrentMonth = () => {
    const today = new Date();
    if (today < START_DATE) return 7; // August (0-indexed)
    if (today > END_DATE) return 11; // December (0-indexed)
    return today.getMonth(); // Current month (0-indexed)
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [attendanceData, setAttendanceData] = useState<Record<string, number>>({});
  const router = useRouter();

  // Get today's date info
  const today = new Date();
  const isToday = (year: number, month: number, day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const months = [
    { value: 7, label: "August 2025", days: getDaysInMonth(2025, 7) },
    { value: 8, label: "September 2025", days: getDaysInMonth(2025, 8) },
    { value: 9, label: "October 2025", days: getDaysInMonth(2025, 9) },
    { value: 10, label: "November 2025", days: getDaysInMonth(2025, 10) },
    { value: 11, label: "December 2025", days: getDaysInMonth(2025, 11) },
  ];

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function isDateInRange(year: number, month: number, day: number) {
    const date = new Date(year, month, day);
    return date >= START_DATE && date <= END_DATE;
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  const currentMonth = months.find((m) => m.value === selectedMonth)!;
  const firstDay = getFirstDayOfMonth(2025, selectedMonth);
  const daysInMonth = currentMonth.days;

  const calendarDays = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push({ day: null, inRange: false });
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const inRange = isDateInRange(2025, selectedMonth, day);
    const isTodayDate = isToday(2025, selectedMonth, day);
    const dateObj = new Date(2025, selectedMonth, day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const isFuture = dateObj > todayDate;
    calendarDays.push({ day, inRange, isToday: isTodayDate, isFuture });
  }

  function handleDateClick(day: number) {
    if (!isDateInRange(2025, selectedMonth, day)) return;

    // Prevent clicking on future dates
    const clickedDate = new Date(2025, selectedMonth, day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (clickedDate > todayDate) return;

    const dateStr = `2025-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/attendance/day/${dateStr}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Attendance Calendar</h2>
          <p className="text-gray-400 text-sm">
            August 27 - December 21, 2025
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {months.map((month) => (
            <motion.button
              key={month.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMonth(month.value)}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedMonth === month.value
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              {month.label}
            </motion.button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/5 rounded-2xl p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-gray-400 font-semibold text-sm py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((item, index) => (
              <motion.button
                key={index}
                whileHover={item.inRange && !item.isFuture ? { scale: 1.05 } : {}}
                whileTap={item.inRange && !item.isFuture ? { scale: 0.95 } : {}}
                onClick={() => item.day && handleDateClick(item.day)}
                disabled={!item.inRange || item.isFuture}
                className={`aspect-square rounded-xl flex items-center justify-center font-semibold transition-all ${
                  !item.day
                    ? "invisible"
                    : item.isToday
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-2 border-emerald-400 shadow-lg cursor-pointer ring-2 ring-emerald-400/50"
                    : item.isFuture
                    ? "bg-white/5 text-gray-600 cursor-not-allowed"
                    : item.inRange
                    ? "bg-white/10 text-white hover:bg-cyan-500/30 hover:border-cyan-400 border-2 border-transparent cursor-pointer"
                    : "bg-white/5 text-gray-600 cursor-not-allowed"
                }`}
              >
                {item.day}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded border-2 border-emerald-400 ring-2 ring-emerald-400/50" />
            <span className="text-gray-400">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/10 rounded border-2 border-transparent" />
            <span className="text-gray-400">Available dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/5 rounded" />
            <span className="text-gray-600">Out of range</span>
          </div>
        </div>
      </div>
    </div>
  );
}
