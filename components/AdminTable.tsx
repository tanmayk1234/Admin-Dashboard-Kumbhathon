"use client";

import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ArrowUpDown, Download } from "lucide-react";
import InternCard from "./InternCard";

interface AdminTableProps {
  activeTab: "interns" | "attendance";
  interns: string[][];
  attendance: string[][];
  internHeaders: string[];
  attendanceHeaders: string[];
  onExport: () => void;
}

export default function AdminTable({
  activeTab,
  interns,
  attendance,
  attendanceHeaders,
  onExport,
}: AdminTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const shouldReduceMotion = useReducedMotion();

  // ── Interns filtering + sorting ──
  const filteredInterns = useMemo(() => {
    let rows = [...interns];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row[0]?.toLowerCase().includes(q) || // Intern ID
          row[1]?.toLowerCase().includes(q) || // Name
          row[3]?.toLowerCase().includes(q) // Email
      );
    }
    if (sortField !== null) {
      rows.sort((a, b) => {
        const valA = a[sortField] || "";
        const valB = b[sortField] || "";
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }
    return rows;
  }, [interns, search, sortField, sortAsc]);

  // ── Attendance filtering ──
  const filteredAttendance = useMemo(() => {
    let rows = [...attendance];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row[1]?.toLowerCase().includes(q) || // Intern ID
          row[2]?.toLowerCase().includes(q) // Name
      );
    }
    if (dateFrom) {
      rows = rows.filter((row) => row[4] >= dateFrom);
    }
    if (dateTo) {
      rows = rows.filter((row) => row[4] <= dateTo);
    }
    if (filterType !== "all") {
      rows = rows.filter((row) => row[3] === filterType);
    }
    return rows;
  }, [attendance, search, dateFrom, dateTo, filterType]);

  const handleSort = (fieldIndex: number) => {
    if (sortField === fieldIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(fieldIndex);
      setSortAsc(true);
    }
  };

  // Get attendance rows for a specific intern
  const getInternAttendance = (internId: string) => {
    return attendance.filter((row) => row[1] === internId);
  };

  return (
    <div>
      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-brown"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={
              activeTab === "interns"
                ? "Search by name, email, or ID..."
                : "Search by name or ID..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            aria-label="Search"
            id="admin-search-input"
          />
        </div>

        {activeTab === "attendance" && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field w-auto"
              aria-label="From date"
              id="admin-date-from"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field w-auto"
              aria-label="To date"
              id="admin-date-to"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field select-field w-auto"
              aria-label="Filter by type"
              id="admin-type-filter"
            >
              <option value="all">All Types</option>
              <option value="CHECK_IN">Check In</option>
              <option value="CHECK_OUT">Check Out</option>
            </select>
          </>
        )}

        {activeTab === "attendance" && (
          <button
            onClick={onExport}
            className="btn-primary text-sm px-6 py-3 flex items-center gap-2"
            id="export-button"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export to Excel
          </button>
        )}
      </div>

      {/* Interns Tab Content */}
      {activeTab === "interns" && (
        <div className="space-y-3">
          {/* Sort controls */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {["ID", "Name", "Email", "Title"].map((label, i) => {
              const fieldIndex = [0, 1, 3, 4][i];
              return (
                <button
                  key={label}
                  onClick={() => handleSort(fieldIndex)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                    sortField === fieldIndex
                      ? "bg-primary-terracotta text-cream border-primary-terracotta"
                      : "bg-white text-muted-brown border-warm-sand hover:border-primary-terracotta"
                  }`}
                  aria-label={`Sort by ${label}`}
                >
                  {label}
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          {filteredInterns.length === 0 ? (
            <p className="text-center text-muted-brown py-12">
              No interns found
            </p>
          ) : (
            filteredInterns.map((intern, i) => (
              <motion.div
                key={intern[0] || i}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <InternCard
                  intern={intern}
                  attendance={getInternAttendance(intern[0])}
                />
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Attendance Tab Content */}
      {activeTab === "attendance" && (
        <div className="overflow-x-auto">
          <table className="w-full" id="attendance-table">
            <thead>
              <tr className="border-b border-warm-sand">
                {attendanceHeaders.map((header, i) => (
                  <th
                    key={i}
                    className="text-left text-xs uppercase tracking-wider text-muted-brown font-medium px-4 py-3"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td
                    colSpan={attendanceHeaders.length}
                    className="text-center text-muted-brown py-12"
                  >
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((row, i) => (
                  <motion.tr
                    key={row[0] || i}
                    className="border-b border-warm-sand/50 hover:bg-warm-sand/20 transition-colors"
                    initial={shouldReduceMotion ? {} : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`px-4 py-3 text-sm ${
                          j === 0 || j === 1
                            ? "font-mono text-xs text-muted-brown"
                            : ""
                        } ${
                          j === 3
                            ? cell === "CHECK_IN"
                              ? "text-success-green font-medium"
                              : "text-primary-terracotta font-medium"
                            : ""
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
