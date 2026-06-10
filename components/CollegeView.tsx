"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, ChevronDown, ChevronRight, GripVertical, RotateCcw, Building2 } from "lucide-react";

interface CollegeViewProps {
  interns: string[][];
}

// Intern row indices: 0=ID, 1=Name, 2=Phone, 3=Email, 4=Title, 5=School, 6=Period, 7=JoinDate
const SCHOOL_IDX = 5;

function buildGroups(interns: string[][]): Record<string, string[][]> {
  const map: Record<string, string[][]> = {};
  for (const intern of interns) {
    const college = intern[SCHOOL_IDX]?.trim() || "Unknown";
    if (!map[college]) map[college] = [];
    map[college].push(intern);
  }
  return map;
}

export default function CollegeView({ interns }: CollegeViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");

  const initialGroups = useMemo(() => buildGroups(interns), [interns]);
  const [groups, setGroups] = useState<Record<string, string[][]>>(initialGroups);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCollege, setDragOverCollege] = useState<string | null>(null);
  const dragSourceCollege = useRef<string | null>(null);

  const reset = () => setGroups(buildGroups(interns));

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    const result: Record<string, string[][]> = {};
    for (const [college, rows] of Object.entries(groups)) {
      if (college.toLowerCase().includes(q)) {
        result[college] = rows;
        continue;
      }
      const matched = rows.filter(
        (r) =>
          r[0]?.toLowerCase().includes(q) ||
          r[1]?.toLowerCase().includes(q) ||
          r[3]?.toLowerCase().includes(q)
      );
      if (matched.length > 0) result[college] = matched;
    }
    return result;
  }, [groups, search]);

  const toggleCollapse = (college: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(college)) next.delete(college);
      else next.add(college);
      return next;
    });
  };

  const handleDragStart = (internId: string, sourceCollege: string) => {
    setDraggedId(internId);
    dragSourceCollege.current = sourceCollege;
  };

  const handleDragOver = (e: React.DragEvent, college: string) => {
    e.preventDefault();
    setDragOverCollege(college);
  };

  const handleDragLeave = (e: React.DragEvent, college: string) => {
    // Only clear if leaving the college card itself, not a child
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCollege((prev) => (prev === college ? null : prev));
    }
  };

  const handleDrop = (e: React.DragEvent, targetCollege: string) => {
    e.preventDefault();
    const src = dragSourceCollege.current;
    if (!draggedId || !src || src === targetCollege) {
      cleanup();
      return;
    }

    setGroups((prev) => {
      const next = { ...prev };
      const srcRows = [...(next[src] || [])];
      const intern = srcRows.find((r) => r[0] === draggedId);
      if (!intern) return prev;

      next[src] = srcRows.filter((r) => r[0] !== draggedId);
      if (next[src].length === 0) delete next[src];
      next[targetCollege] = [...(next[targetCollege] || []), intern];
      return next;
    });

    cleanup();
  };

  const cleanup = () => {
    setDraggedId(null);
    setDragOverCollege(null);
    dragSourceCollege.current = null;
  };

  const colleges = Object.keys(filteredGroups).sort((a, b) =>
    a.localeCompare(b)
  );
  const totalVisible = Object.values(filteredGroups).reduce(
    (s, r) => s + r.length,
    0
  );

  return (
    <div>
      {/* Search + Reset */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-brown"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search by college, name, email, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
            aria-label="Search colleges and interns"
          />
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-warm-sand bg-white text-muted-brown hover:border-primary-terracotta hover:text-primary-terracotta transition-colors text-sm shrink-0"
          title="Reset groupings to original college names"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Summary + hint */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-muted-brown">
          {colleges.length} college{colleges.length !== 1 ? "s" : ""} ·{" "}
          {totalVisible} intern{totalVisible !== 1 ? "s" : ""}
          {search ? " (filtered)" : ""}
        </p>
        <p className="text-xs text-muted-brown/60 hidden sm:block">
          Drag an intern row to move them to a different college group
        </p>
      </div>

      {/* College Groups */}
      <div className="space-y-4">
        {colleges.length === 0 && (
          <p className="text-center text-muted-brown py-12">No results found</p>
        )}

        {colleges.map((college, ci) => {
          const rows = filteredGroups[college];
          const isCollapsed = collapsed.has(college);
          const isDragOver = dragOverCollege === college;

          return (
            <motion.div
              key={college}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04 }}
              onDragOver={(e) => handleDragOver(e, college)}
              onDragLeave={(e) => handleDragLeave(e, college)}
              onDrop={(e) => handleDrop(e, college)}
              className={`rounded-[16px] border-2 transition-all duration-150 shadow-card ${
                isDragOver
                  ? "border-primary-terracotta bg-primary-terracotta/5 shadow-none scale-[1.01]"
                  : "border-warm-sand bg-white"
              }`}
            >
              {/* College Header — click to collapse */}
              <button
                onClick={() => toggleCollapse(college)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
                aria-expanded={!isCollapsed}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--warm-sand)" }}
                >
                  <Building2
                    className="w-4 h-4 text-muted-brown"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">{college}</p>
                  <p className="text-xs text-muted-brown mt-0.5">
                    {rows.length} intern{rows.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <span className="shrink-0 text-muted-brown">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                </span>
              </button>

              {/* Intern rows */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    key="rows"
                    initial={
                      shouldReduceMotion ? {} : { height: 0, opacity: 0 }
                    }
                    animate={{ height: "auto", opacity: 1 }}
                    exit={
                      shouldReduceMotion ? {} : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    {/* Column headers */}
                    <div className="border-t border-warm-sand px-5 py-2 grid grid-cols-2 md:grid-cols-4 gap-x-4">
                      {["ID", "Name", "Email", "Internship Title"].map((h) => (
                        <span
                          key={h}
                          className="text-[10px] uppercase tracking-wider text-muted-brown font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="divide-y divide-warm-sand/40">
                      {rows.map((intern) => {
                        const isDragging = draggedId === intern[0];
                        return (
                          <div
                            key={intern[0]}
                            draggable
                            onDragStart={() =>
                              handleDragStart(intern[0], college)
                            }
                            onDragEnd={cleanup}
                            className={`flex items-center gap-3 px-5 py-3 transition-colors select-none ${
                              isDragging
                                ? "opacity-30 bg-warm-sand/30"
                                : "hover:bg-warm-sand/20 cursor-grab active:cursor-grabbing"
                            }`}
                          >
                            <GripVertical
                              className="w-4 h-4 text-warm-sand shrink-0"
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5">
                              <span className="font-mono text-xs text-muted-brown truncate">
                                {intern[0]}
                              </span>
                              <span className="text-sm font-medium text-charcoal truncate">
                                {intern[1]}
                              </span>
                              <span className="text-xs text-muted-brown truncate">
                                {intern[3] || "—"}
                              </span>
                              <span className="text-xs text-muted-brown truncate">
                                {intern[4] || "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
