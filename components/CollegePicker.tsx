"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, Building2, LogOut, RefreshCw, Users, GripVertical, ChevronRight } from "lucide-react";

const SCHOOL_IDX = 5;

const PALETTE = [
  { bg: "rgba(200,85,61,0.08)", border: "rgba(200,85,61,0.25)", accent: "#C8553D" },
  { bg: "rgba(74,124,89,0.08)",  border: "rgba(74,124,89,0.25)",  accent: "#4A7C59" },
  { bg: "rgba(107,79,63,0.08)", border: "rgba(107,79,63,0.25)", accent: "#6B4F3F" },
  { bg: "rgba(139,58,42,0.08)", border: "rgba(139,58,42,0.25)", accent: "#8B3A2A" },
];

function cardColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

interface CollegePickerProps {
  interns: string[][];
  onSelectCollege: (college: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
  lastUpdated: string;
  loading: boolean;
}

export default function CollegePicker({
  interns,
  onSelectCollege,
  onLogout,
  onRefresh,
  lastUpdated,
  loading,
}: CollegePickerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");

  const collegeMap = useMemo(() => {
    const map: Record<string, string[][]> = {};
    for (const intern of interns) {
      const c = intern[SCHOOL_IDX]?.trim() || "Unknown";
      if (!map[c]) map[c] = [];
      map[c].push(intern);
    }
    return map;
  }, [interns]);

  const sortedColleges = useMemo(
    () => Object.keys(collegeMap).sort((a, b) => a.localeCompare(b)),
    [collegeMap]
  );

  // Drag-to-reorder state
  const [order, setOrder] = useState<string[]>(sortedColleges);
  useEffect(() => { setOrder(sortedColleges); }, [sortedColleges]);

  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
    setDraggingIdx(idx);
  };
  const handleDragEnter = (idx: number) => { overIdx.current = idx; };
  const handleDragEnd = () => {
    if (
      dragIdx.current !== null &&
      overIdx.current !== null &&
      dragIdx.current !== overIdx.current
    ) {
      const next = [...order];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      setOrder(next);
    }
    dragIdx.current = null;
    overIdx.current = null;
    setDraggingIdx(null);
  };

  const displayed = useMemo(() => {
    if (!search) return order;
    const q = search.toLowerCase();
    return order.filter((c) => c.toLowerCase().includes(q));
  }, [order, search]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-warm-sand">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <p
            className="text-muted-brown text-sm tracking-widest font-medium"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            KUMBHATHON
          </p>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span
                className="text-xs text-muted-brown/50 hidden sm:block"
                style={{ fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {lastUpdated}
              </span>
            )}
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-warm-sand transition-colors"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-brown ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-brown hover:bg-warm-sand transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Page heading */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mb-8"
        >
          <h1
            className="text-4xl md:text-5xl text-charcoal mb-2"
            style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400 }}
          >
            Select a College
          </h1>
          <p className="text-muted-brown text-sm">
            {interns.length} intern{interns.length !== 1 ? "s" : ""} across{" "}
            {sortedColleges.length} college{sortedColleges.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative mb-3 max-w-sm"
        >
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-brown"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search college…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            aria-label="Search colleges"
          />
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-muted-brown/40 mb-6 flex items-center gap-1.5"
        >
          <GripVertical className="w-3 h-3" aria-hidden="true" />
          Drag to reorder · Click to open dashboard
        </motion.p>

        {/* Skeleton while loading */}
        {loading && interns.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-[16px]" />
            ))}
          </div>
        )}

        {/* College grid */}
        {!loading || interns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {displayed.map((college, idx) => {
                const rows = collegeMap[college] || [];
                const clr = cardColor(college);
                const isDragging = draggingIdx === idx;

                return (
                  <motion.div
                    key={college}
                    layout
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                    animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      layout: { duration: 0.25 },
                      opacity: { duration: 0.35, delay: idx * 0.05 },
                      y: { type: "spring", stiffness: 260, damping: 22, delay: idx * 0.05 },
                      scale: { type: "spring", stiffness: 300, damping: 20 },
                    }}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    whileHover={
                      shouldReduceMotion
                        ? {}
                        : {
                            y: -7,
                            scale: 1.02,
                            boxShadow: "0 20px 56px rgba(200,85,61,0.18)",
                          }
                    }
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95, y: 0 }}
                    onClick={() => onSelectCollege(college)}
                    className="bg-white rounded-[16px] p-6 border-2 cursor-pointer shadow-card select-none"
                    style={{ borderColor: clr.border }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onSelectCollege(college)}
                    aria-label={`Open dashboard for ${college}`}
                  >
                    {/* Card top row */}
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: clr.bg }}
                      >
                        <Building2
                          className="w-5 h-5"
                          style={{ color: clr.accent }}
                          aria-hidden="true"
                        />
                      </div>
                      <GripVertical
                        className="w-4 h-4 text-warm-sand cursor-grab mt-0.5"
                        aria-hidden="true"
                      />
                    </div>

                    {/* College name */}
                    <h2
                      className="font-medium text-charcoal text-lg leading-snug mb-3 line-clamp-2"
                      style={{ fontFamily: "var(--font-fraunces), serif" }}
                    >
                      {college}
                    </h2>

                    {/* Footer row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users
                          className="w-3.5 h-3.5"
                          style={{ color: clr.accent }}
                          aria-hidden="true"
                        />
                        <span className="text-sm text-muted-brown">
                          {rows.length} intern{rows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-muted-brown/40"
                        aria-hidden="true"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {displayed.length === 0 && !loading && (
              <p className="col-span-full text-center text-muted-brown py-16">
                No colleges found
              </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
