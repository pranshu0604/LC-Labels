"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Person {
  id: number;
  uid: string;
  name: string;
  registration_no: string;
  contact_no: string;
  attendance_count: number;
}

interface DuplicateReview {
  existing: Person;
  new: { name: string; registration_no: string; contact_no: string };
}

export default function PeopleManagement() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "attendance" | "registration" | "uid">("registration");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReview[]>([]);
  const [manualDuplicate, setManualDuplicate] = useState<DuplicateReview | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "more" | "less">("all");
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add person form
  const [newPerson, setNewPerson] = useState({
    name: "",
    registration_no: "",
    contact_no: "",
  });

  useEffect(() => {
    fetchPeople();
  }, [search, sortBy, sortOrder]);

  async function fetchPeople() {
    try {
      // Calculate cutoff date (December 21, 2025 or today, whichever is earlier)
      const dec21 = new Date(2025, 11, 21); // December 21, 2025
      const today = new Date();
      const cutoffDate = today < dec21 ? today : dec21;
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const params = new URLSearchParams({
        ...(search && { search }),
        sortBy,
        sortOrder,
        cutoffDate: cutoffDateStr,
      });

      const res = await fetch(`/api/attendance/people?${params}`);
      const data = await res.json();
      setPeople(data.people || []);
    } catch (error) {
      console.error("Error fetching people:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPerson() {
    if (!newPerson.name || !newPerson.registration_no) {
      toast.error("Name and Registration No. are required");
      return;
    }

    setIsAddingPerson(true);
    try {
      const res = await fetch("/api/attendance/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPerson),
      });

      if (res.status === 409) {
        const data = await res.json();
        // Check if there are actual differences (normalize empty strings and null)
        const hasChanges =
          data.existing.name !== newPerson.name ||
          (data.existing.contact_no || "") !== (newPerson.contact_no || "");

        if (hasChanges) {
          // Show duplicate review if there are changes
          setManualDuplicate({
            existing: {
              id: data.existing.id,
              uid: data.existing.uid,
              name: data.existing.name,
              registration_no: data.existing.registration_no,
              contact_no: data.existing.contact_no,
              attendance_count: 0, // Not needed for review
            },
            new: {
              name: newPerson.name,
              registration_no: newPerson.registration_no,
              contact_no: newPerson.contact_no,
            },
          });
        } else {
          // No changes, just inform the user
          toast.info(`This person already exists with the same details: ${data.existing.name} (${data.existing.registration_no})`);
        }
        return;
      }

      if (res.ok) {
        await fetchPeople();
        setShowAddDialog(false);
        setNewPerson({ name: "", registration_no: "", contact_no: "" });
        toast.success("Person added successfully!");
      } else {
        toast.error("Failed to add person");
      }
    } catch (error) {
      console.error("Error adding person:", error);
      toast.error("Failed to add person");
    } finally {
      setIsAddingPerson(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);

    // Extract worksheets
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheets = workbook.SheetNames;
      setWorksheets(sheets);
      setSelectedWorksheet(sheets[0] || "");
    } catch (error) {
      console.error("Failed to extract worksheets:", error);
      toast.error("Failed to read Excel file");
    }
  }

  async function handleFileUpload() {
    if (!uploadFile || !selectedWorksheet) return;

    // Get total row count before uploading
    try {
      const XLSX = await import("xlsx");
      const buffer = await uploadFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[selectedWorksheet];
      const data: any[] = XLSX.utils.sheet_to_json(sheet);

      setUploadProgress({ current: 0, total: data.length });
      setIsUploading(true);
    } catch (error) {
      console.error("Failed to read file:", error);
      toast.error("Failed to read Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("worksheet", selectedWorksheet);

    try {
      const res = await fetch("/api/attendance/people/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        toast.error(`Error: ${data.error}`);
        setIsUploading(false);
        setUploadProgress({ current: 0, total: 0 });
        return;
      }

      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicateReviews(data.duplicates);
      }

      if ((data.added && data.added.length > 0) || (data.duplicates && data.duplicates.length > 0) || data.skipped > 0) {
        await fetchPeople();
        toast.success(
          `Upload Complete - Added: ${data.added?.length || 0}, Duplicates (need review): ${data.duplicates?.length || 0}, Skipped (identical): ${data.skipped || 0}, Errors: ${data.errors?.length || 0}`,
          { duration: 5000 }
        );
      }

      setShowUploadDialog(false);
      setUploadFile(null);
      setWorksheets([]);
      setSelectedWorksheet("");
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function handleUpdateDuplicate(duplicate: DuplicateReview) {
    setConfirmDialog({
      show: true,
      title: "Update Person",
      message: `Update ${duplicate.existing.name} with new data?`,
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          const res = await fetch("/api/attendance/people", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: duplicate.existing.id,
              name: duplicate.new.name,
              contact_no: duplicate.new.contact_no,
            }),
          });

          if (res.ok) {
            await fetchPeople();
            setDuplicateReviews(duplicateReviews.filter((d) => d !== duplicate));
            toast.success("Person updated successfully!");
          } else {
            toast.error("Failed to update person");
          }
        } catch (error) {
          console.error("Error updating person:", error);
          toast.error("Failed to update person");
        } finally {
          setIsUpdating(false);
        }
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  }

  async function handleUpdateManualDuplicate() {
    if (!manualDuplicate) return;

    setConfirmDialog({
      show: true,
      title: "Update Person",
      message: `Update ${manualDuplicate.existing.name} with new data?`,
      onConfirm: async () => {
        if (!manualDuplicate) return;

        setIsUpdating(true);
        try {
          const res = await fetch("/api/attendance/people", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: manualDuplicate.existing.id,
              name: manualDuplicate.new.name,
              contact_no: manualDuplicate.new.contact_no,
            }),
          });

          if (res.ok) {
            await fetchPeople();
            setManualDuplicate(null);
            setShowAddDialog(false);
            setNewPerson({ name: "", registration_no: "", contact_no: "" });
            toast.success("Person updated successfully!");
          } else {
            toast.error("Failed to update person");
          }
        } catch (error) {
          console.error("Error updating person:", error);
          toast.error("Failed to update person");
        } finally {
          setIsUpdating(false);
        }
        setConfirmDialog({ show: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch("/api/attendance/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Attendance report exported successfully!");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePersonClick(person: Person) {
    setSelectedPerson(person);
    setLoadingAttendance(true);

    try {
      const res = await fetch(`/api/attendance/people/${person.id}/dates`);
      const data = await res.json();

      if (data.dates) {
        setAttendanceDates(data.dates);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance dates");
    } finally {
      setLoadingAttendance(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Duplicate Reviews */}
      {duplicateReviews.length > 0 && (
        <div className="bg-yellow-500/10 backdrop-blur-xl rounded-3xl p-6 border border-yellow-500/30">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">
            Duplicate Entries Found
          </h3>
          <div className="space-y-3">
            {duplicateReviews.map((dup, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold mb-2">
                  Registration No: {dup.existing.registration_no}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-gray-400">Existing:</p>
                    <p className="text-white">{dup.existing.name}</p>
                    <p className="text-gray-400">{dup.existing.contact_no || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">New:</p>
                    <p className="text-white">{dup.new.name}</p>
                    <p className="text-gray-400">{dup.new.contact_no || "N/A"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleUpdateDuplicate(dup)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? "Updating..." : "Update with New Data"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() =>
                      setDuplicateReviews(duplicateReviews.filter((d) => d !== dup))
                    }
                    disabled={isUpdating}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Existing
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by name, registration no., or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortBy(field as "name" | "attendance" | "registration" | "uid");
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="registration-asc" className="bg-slate-900">Registration No. (Ascending)</option>
              <option value="registration-desc" className="bg-slate-900">Registration No. (Descending)</option>
              <option value="uid-asc" className="bg-slate-900">UID (Ascending)</option>
              <option value="uid-desc" className="bg-slate-900">UID (Descending)</option>
              <option value="name-asc" className="bg-slate-900">Name (A-Z)</option>
              <option value="name-desc" className="bg-slate-900">Name (Z-A)</option>
              <option value="attendance-desc" className="bg-slate-900">Attendance (High-Low)</option>
              <option value="attendance-asc" className="bg-slate-900">Attendance (Low-High)</option>
            </select>

            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as "all" | "more" | "less")}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              title="Filter by attendance days"
            >
              <option value="all" className="bg-slate-900">All Attendance</option>
              <option value="more" className="bg-slate-900">≥ (More than or equal)</option>
              <option value="less" className="bg-slate-900">≤ (Less than or equal)</option>
            </select>

            {attendanceFilter !== "all" && (
              <input
                type="number"
                min="0"
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                placeholder="Days"
                title="Number of attendance days"
                className="w-24 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold"
            >
              + Add Person
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowUploadDialog(true)}
              className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold"
            >
              📤 Upload Excel
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "📥 Export"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">
          All People ({(() => {
            const filtered = people.filter((person) => {
              if (attendanceFilter === "all") return true;
              if (attendanceFilter === "more") return person.attendance_count >= attendanceThreshold;
              if (attendanceFilter === "less") return person.attendance_count <= attendanceThreshold;
              return true;
            });
            return filtered.length;
          })()})
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
            <p>Loading people...</p>
          </div>
        ) : (() => {
            const filteredPeople = people.filter((person) => {
              if (attendanceFilter === "all") return true;
              if (attendanceFilter === "more") return person.attendance_count >= attendanceThreshold;
              if (attendanceFilter === "less") return person.attendance_count <= attendanceThreshold;
              return true;
            });
            return filteredPeople.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No people found matching the filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-400 font-semibold py-3 px-4">UID</th>
                      <th className="text-left text-gray-400 font-semibold py-3 px-4">Name</th>
                      <th className="text-left text-gray-400 font-semibold py-3 px-4">Registration No.</th>
                      <th className="text-left text-gray-400 font-semibold py-3 px-4">Contact No.</th>
                      <th className="text-left text-gray-400 font-semibold py-3 px-4">Attendance Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeople.map((person) => (
                      <motion.tr
                        key={person.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => handlePersonClick(person)}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-4 text-cyan-400 font-mono text-sm">{person.uid}</td>
                        <td className="py-4 px-4 text-white font-medium">{person.name}</td>
                        <td className="py-4 px-4 text-gray-300">{person.registration_no}</td>
                        <td className="py-4 px-4 text-gray-300">{person.contact_no || "N/A"}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold text-sm">
                            {person.attendance_count} days
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
      </div>

      {/* Add Person Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl p-8 border border-white/10 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Add New Person</h3>

            {/* Show duplicate review if it exists */}
            {manualDuplicate ? (
              <div className="space-y-6">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 font-semibold mb-3">
                    Duplicate Registration Number Found
                  </p>
                  <p className="text-white font-semibold mb-4">
                    Registration No: {manualDuplicate.existing.registration_no}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400 mb-1">Existing:</p>
                      <p className="text-white font-medium">{manualDuplicate.existing.name}</p>
                      <p className="text-gray-400">{manualDuplicate.existing.contact_no || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">New:</p>
                      <p className="text-white font-medium">{manualDuplicate.new.name}</p>
                      <p className="text-gray-400">{manualDuplicate.new.contact_no || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={handleUpdateManualDuplicate}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? "Updating..." : "Update with New Data"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setManualDuplicate(null)}
                    disabled={isUpdating}
                    className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Existing
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setShowAddDialog(false);
                    setManualDuplicate(null);
                    setNewPerson({ name: "", registration_no: "", contact_no: "" });
                  }}
                  className="w-full px-6 py-3 bg-white/10 text-white rounded-xl"
                >
                  Cancel
                </motion.button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Registration No. *"
                    value={newPerson.registration_no}
                    onChange={(e) =>
                      setNewPerson({ ...newPerson, registration_no: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Contact No."
                    value={newPerson.contact_no}
                    onChange={(e) =>
                      setNewPerson({ ...newPerson, contact_no: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setShowAddDialog(false);
                      setNewPerson({ name: "", registration_no: "", contact_no: "" });
                    }}
                    className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={handleAddPerson}
                    disabled={isAddingPerson}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingPerson ? "Adding..." : "Add Person"}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl p-8 border border-white/10 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Upload Excel File</h3>
            <p className="text-gray-400 text-sm mb-6">
              Upload an Excel file with columns: NAME, Registration No., Contact No.
            </p>

            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-white file:cursor-pointer mb-4"
            />

            {worksheets.length > 0 && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Select Worksheet</label>
                <select
                  value={selectedWorksheet}
                  onChange={(e) => setSelectedWorksheet(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {worksheets.map((ws) => (
                    <option key={ws} value={ws} className="bg-slate-900">
                      {ws}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFile(null);
                  setWorksheets([]);
                  setSelectedWorksheet("");
                  setIsUploading(false);
                  setUploadProgress({ current: 0, total: 0 });
                }}
                disabled={isUploading}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={handleFileUpload}
                disabled={!uploadFile || !selectedWorksheet || isUploading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? `Processing ${uploadProgress.total} records...` : "Upload"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Attendance History Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-3xl p-8 border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedPerson.name}</h3>
                <p className="text-gray-400 text-sm">
                  {selectedPerson.registration_no} • {selectedPerson.contact_no || "No contact"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => {
                  setSelectedPerson(null);
                  setAttendanceDates([]);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </motion.button>
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-3">
                Attendance History ({attendanceDates.length} days)
              </h4>
              {loadingAttendance ? (
                <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mb-3"></div>
                  <p>Loading attendance history...</p>
                </div>
              ) : attendanceDates.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No attendance records found</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {attendanceDates.map((date) => (
                    <div
                      key={date}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center"
                    >
                      <p className="text-white font-medium">
                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setSelectedPerson(null);
                  setAttendanceDates([]);
                }}
                className="w-full px-6 py-3 bg-white/10 text-white rounded-xl"
              >
                Close
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl"
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
