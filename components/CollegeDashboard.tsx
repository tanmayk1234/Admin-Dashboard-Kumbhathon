"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import {
  ArrowLeft,
  Users,
  LogIn,
  Building2,
  MapPin,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  Briefcase,
  ChevronDown,
  GripVertical,
  CheckCircle2,
  Circle,
  Target,
  Download,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const SCHOOL_IDX = 5;
const OFFICE_LAT = "20.018153";
const OFFICE_LNG = "73.7564091";
const OFFICE_RADIUS = "200";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendancePair {
  internId: string;
  name: string;
  date: string;
  checkIn: string;
  checkOut: string;
  gps: string;
}

interface CollegeDashboardProps {
  college: string;
  interns: string[][];
  attendance: string[][];
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pairAttendance(
  attendance: string[][],
  internIds: Set<string>
): AttendancePair[] {
  const map: Record<string, AttendancePair> = {};
  for (const row of attendance) {
    const [, internId, name, type, date, time, gps] = row;
    if (!internIds.has(internId)) continue;
    const key = `${internId}|${date}`;
    if (!map[key]) {
      map[key] = { internId, name, date, checkIn: "—", checkOut: "—", gps: "—" };
    }
    if (type === "CHECK_IN") {
      map[key].checkIn = time || "—";
      map[key].gps = gps || "—";
    } else {
      map[key].checkOut = time || "—";
    }
  }
  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
}

function getToday() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
}

function fmtDate(iso: string) {
  if (!iso?.includes("-")) return iso ?? "—";
  const [y, m, d] = iso.split("-");
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${mo[+m - 1]} ${y}`;
}

function parseTimeToMinutes(t: string): number | null {
  if (!t || t === "—") return null;
  const m = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const sec = parseInt(m[3] || "0");
  const period = m[4].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min + sec / 60;
}

function computeDuration(checkIn: string, checkOut: string): string {
  const inM = parseTimeToMinutes(checkIn);
  const outM = parseTimeToMinutes(checkOut);
  if (inM === null || outM === null) return "—";
  const diff = outM - inM;
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 60);
  const m = Math.round(diff % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function downloadStudentExcel(intern: string[], pairs: AttendancePair[]) {

  const name     = intern[1] || "Intern";
  const id       = intern[0] || "";
  const college  = intern[5] || "";
  const title    = intern[4] || "";
  const phone    = intern[2] || "";
  const email    = intern[3] || "";
  const period   = intern[6] || "";
  const joinDate = intern[7] || "";

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const rows: (string | number)[][] = [
    ["KUMBHATHON INTERN ATTENDANCE REPORT"],
    [`Generated: ${today}`],
    [],
    ["Intern ID",         id],
    ["Name",              name],
    ["College",           college],
    ["Internship Title",  title],
    ["Phone",             phone],
    ["Email",             email],
    ["Period",            period],
    ["Joining Date",      joinDate],
    [],
    ["Office Coordinates", `Lat: ${OFFICE_LAT}, Lng: ${OFFICE_LNG} (${OFFICE_RADIUS}m radius)`],
    [],
    ["Date", "Check-In", "Check-Out", "Duration", "Location (GPS)", "Status"],
    ...pairs.map((p) => {
      const dur    = computeDuration(p.checkIn, p.checkOut);
      const status = p.checkIn !== "—" && p.checkOut !== "—"
        ? "Complete"
        : p.checkIn !== "—"
        ? "In Progress"
        : "Absent";
      return [
        fmtDate(p.date),
        p.checkIn  !== "—" ? p.checkIn  : "",
        p.checkOut !== "—" ? p.checkOut : "",
        dur        !== "—" ? dur        : "",
        p.gps      !== "—" ? p.gps      : "",
        status,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 }, // Date
    { wch: 14 }, // Check-In
    { wch: 14 }, // Check-Out
    { wch: 12 }, // Duration
    { wch: 46 }, // GPS
    { wch: 14 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  XLSX.writeFile(wb, `Attendance_${name.replace(/\s+/g, "_")}_${id}.xlsx`);
}

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || target === 0) { setCount(target); return; }
    let raf: number;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, shouldReduceMotion]);

  return count;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
  pulse = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  delay: number;
  pulse?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const displayed = useCountUp(value);

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={shouldReduceMotion ? {} : { y: -3, boxShadow: "0 12px 32px rgba(200,85,61,0.13)" }}
      className="bg-white rounded-[16px] shadow-card p-5 flex items-center gap-4 cursor-default"
    >
      {/* Icon with animated ring */}
      <div className="relative shrink-0">
        <motion.div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
          animate={pulse && value > 0 && !shouldReduceMotion
            ? { scale: [1, 1.08, 1], opacity: [1, 0.85, 1] }
            : {}}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
        </motion.div>
        {pulse && value > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-success-green border-2 border-white">
            <motion.span
              className="absolute inset-0 rounded-full bg-success-green"
              animate={shouldReduceMotion ? {} : { scale: [1, 2.2], opacity: [0.7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
        )}
      </div>

      <div>
        <motion.p
          className="text-3xl font-semibold text-charcoal leading-none"
          key={displayed}
        >
          {displayed}
        </motion.p>
        <p className="text-xs text-muted-brown mt-1.5">{label}</p>
      </div>
    </motion.div>
  );
}

function ProfileCard({ intern, index }: { intern: string[]; index: number }) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Safe destructure with defaults
  const id        = intern[0] || "—";
  const name      = intern[1] || "Unknown";
  const phone     = intern[2] || "—";
  const email     = intern[3] || "—";
  const title     = intern[4] || "—";
  const period    = intern[6] || "—";
  const joinDate  = intern[7] || "—";

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.3 + index * 0.06, ease: "easeOut" }}
      className="bg-white rounded-[16px] shadow-card border border-warm-sand/50 overflow-hidden"
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-warm-sand/20 transition-colors"
        aria-expanded={open}
      >
        {/* Avatar with terracotta ring when open */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${
            open ? "bg-primary-terracotta/15" : "bg-warm-sand"
          }`}
        >
          <User
            className={`w-4 h-4 transition-colors duration-200 ${
              open ? "text-primary-terracotta" : "text-muted-brown"
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-charcoal text-sm truncate">{name}</p>
          <p className="text-[11px] text-muted-brown/60 font-mono mt-0.5">{id}</p>
        </div>

        {/* Animated chevron */}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-muted-brown" aria-hidden="true" />
        </motion.span>
      </button>

      {/* max-height accordion — avoids the 1fr/auto-height circular dependency */}
      <div
        style={{
          maxHeight: open ? "480px" : "0px",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          transition: shouldReduceMotion
            ? "none"
            : "max-height 0.3s ease-out, opacity 0.22s ease-out",
        }}
      >
          <div className="border-t border-warm-sand/40 px-5 pt-4 pb-5 grid grid-cols-2 gap-3">
            {[
              { icon: Briefcase, label: "Title",  value: title },
              { icon: Mail,      label: "Email",  value: email },
              { icon: Phone,     label: "Phone",  value: phone },
              { icon: Clock,     label: "Period", value: period },
              { icon: Calendar,  label: "Joined", value: fmtDate(joinDate) },
            ].map(({ icon: Ic, label, value }) => (
              <div key={label} className="flex items-start gap-2 min-w-0">
                <Ic className="w-3.5 h-3.5 text-muted-brown/50 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-brown/50 mb-0.5">{label}</p>
                  <p className="text-xs text-charcoal truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
      </div>
    </motion.div>
  );
}

// ── Student List Item (draggable) ─────────────────────────────────────────────

function StudentListItem({
  intern,
  isSelected,
  isCheckedInToday,
  isInsideNow,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
  index,
}: {
  intern: string[];
  isSelected: boolean;
  isCheckedInToday: boolean;
  isInsideNow: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  index: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [id, name, , , title] = intern;

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? {} : { opacity: 0, x: -16 }}
      animate={{ opacity: isDragging ? 0.35 : 1, x: 0 }}
      transition={{
        layout: { duration: 0.2 },
        opacity: { duration: 0.35, delay: 0.4 + index * 0.05 },
        x: { duration: 0.35, delay: 0.4 + index * 0.05, ease: "easeOut" },
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-[12px] cursor-pointer select-none transition-all group ${
        isSelected
          ? "bg-primary-terracotta text-cream shadow-button"
          : "bg-white hover:bg-warm-sand/40 border border-warm-sand/60"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* Drag handle */}
      <GripVertical
        className={`w-3.5 h-3.5 shrink-0 cursor-grab ${
          isSelected ? "text-cream/50" : "text-warm-sand"
        }`}
        aria-hidden="true"
      />

      {/* Status dot */}
      {isInsideNow ? (
        <CheckCircle2
          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cream" : "text-success-green"}`}
          aria-hidden="true"
        />
      ) : isCheckedInToday ? (
        <Circle
          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cream/60" : "text-muted-brown/40"}`}
          aria-hidden="true"
        />
      ) : (
        <Circle
          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cream/30" : "text-warm-sand"}`}
          aria-hidden="true"
        />
      )}

      {/* Name + title */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-cream" : "text-charcoal"}`}>
          {name}
        </p>
        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-cream/60" : "text-muted-brown/60"}`}>
          {title || id}
        </p>
      </div>
    </motion.div>
  );
}

// ── Attendance Detail Panel ───────────────────────────────────────────────────

function AttendanceDetail({
  intern,
  pairs,
}: {
  intern: string[] | null;
  pairs: AttendancePair[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const today = getToday();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!intern) return;
    setDownloading(true);
    try {
      await downloadStudentExcel(intern, pairs);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } finally {
      setDownloading(false);
    }
  }, [intern, pairs]);

  if (!intern) {
    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center h-full min-h-[300px] text-center py-16"
      >
        <motion.div
          className="w-16 h-16 rounded-full bg-warm-sand flex items-center justify-center mb-4"
          animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Users className="w-7 h-7 text-muted-brown/40" aria-hidden="true" />
        </motion.div>
        <p className="text-muted-brown font-medium">Select a student</p>
        <p className="text-muted-brown/50 text-sm mt-1">
          Click any name on the left to view their attendance
        </p>
      </motion.div>
    );
  }

  const [id, name, , , title] = intern;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={shouldReduceMotion ? {} : { opacity: 0, x: 32, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={shouldReduceMotion ? {} : { opacity: 0, x: -32, filter: "blur(4px)" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Student header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="w-11 h-11 rounded-full bg-primary-terracotta/12 flex items-center justify-center shrink-0 border-2 border-primary-terracotta/20"
          >
            <User className="w-5 h-5 text-primary-terracotta" aria-hidden="true" />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="font-medium text-charcoal text-lg leading-tight"
              style={{ fontFamily: "var(--font-fraunces), serif" }}>
              {name}
            </p>
            <p className="text-xs text-muted-brown font-mono mt-0.5">{id} · {title}</p>
          </motion.div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-brown bg-warm-sand px-2.5 py-1 rounded-full">
              {pairs.length} record{pairs.length !== 1 ? "s" : ""}
            </span>

            {/* Download button */}
            <motion.button
              onClick={handleDownload}
              disabled={downloading || pairs.length === 0}
              whileHover={shouldReduceMotion ? {} : { scale: 1.04, y: -1 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-button ${
                downloaded
                  ? "bg-success-green text-white"
                  : "bg-primary-terracotta text-cream hover:bg-deep-terracotta"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Download attendance as Excel"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : downloaded ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                </motion.span>
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {downloading ? "Downloading…" : downloaded ? "Downloaded!" : "Download Excel"}
            </motion.button>
          </div>
        </div>

        {/* Attendance table */}
        {pairs.length === 0 ? (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 bg-white rounded-[16px] border border-warm-sand/50"
          >
            <Calendar className="w-8 h-8 text-warm-sand mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted-brown text-sm">No attendance records yet</p>
          </motion.div>
        ) : (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="bg-white rounded-[16px] border border-warm-sand/60 overflow-hidden shadow-card"
          >
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_100px_80px_1fr] gap-2 px-5 py-3 bg-cream/70 border-b border-warm-sand">
              {["Date", "Check-In", "Check-Out", "Duration", "Location"].map((h) => (
                <span key={h} className="text-[10px] uppercase tracking-wider font-medium text-muted-brown">
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-warm-sand/40">
              {pairs.map((pair, i) => {
                const isToday = pair.date === today;
                const duration = computeDuration(pair.checkIn, pair.checkOut);
                return (
                  <motion.div
                    key={`${pair.internId}|${pair.date}`}
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={shouldReduceMotion ? {} : { backgroundColor: "rgba(242,228,208,0.25)" }}
                    className="grid grid-cols-[1fr_100px_100px_80px_1fr] gap-2 px-5 py-4 items-start transition-colors group"
                  >
                    {/* Date */}
                    <div>
                      <p className="text-sm font-medium text-charcoal">{fmtDate(pair.date)}</p>
                      {isToday && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="inline-block mt-1 px-2 py-0.5 rounded-full bg-success-green/10 text-success-green text-[9px] font-semibold tracking-wide"
                        >
                          TODAY
                        </motion.span>
                      )}
                    </div>

                    {/* Check-In */}
                    <div className="flex items-center gap-1.5">
                      {pair.checkIn !== "—" ? (
                        <>
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-success-green shrink-0"
                            animate={isToday && pair.checkOut === "—" && !shouldReduceMotion
                              ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }
                              : {}}
                            transition={{ duration: 1.6, repeat: Infinity }}
                          />
                          <span className="text-sm font-medium text-success-green">{pair.checkIn}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-brown/30">—</span>
                      )}
                    </div>

                    {/* Check-Out */}
                    <div className="flex items-center gap-1.5">
                      {pair.checkOut !== "—" ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-terracotta shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-primary-terracotta">{pair.checkOut}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-brown/30">—</span>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      {duration !== "—" ? (
                        <span className="text-xs font-medium text-muted-brown bg-warm-sand px-2 py-0.5 rounded-full">
                          {duration}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-brown/30">—</span>
                      )}
                    </div>

                    {/* GPS Location */}
                    <div>
                      {pair.gps !== "—" ? (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-muted-brown/50 mt-0.5 shrink-0" aria-hidden="true" />
                          <span className="text-xs text-muted-brown/80 leading-snug break-all">{pair.gps}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-brown/30">—</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Office reference */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 flex items-start gap-2 p-4 rounded-[12px] bg-white border border-warm-sand/50"
        >
          <Target className="w-4 h-4 text-primary-terracotta shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-charcoal mb-0.5">Office Reference Point</p>
            <p className="text-xs text-muted-brown/70">
              Lat: {OFFICE_LAT}, Lng: {OFFICE_LNG} · {OFFICE_RADIUS}m punch radius
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Section Heading ───────────────────────────────────────────────────────────

function SectionHeading({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <div ref={ref} className="flex items-center gap-3 mb-5">
      <motion.div
        initial={shouldReduceMotion ? {} : { rotate: -15, opacity: 0 }}
        animate={inView ? { rotate: 0, opacity: 1 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Icon className="w-5 h-5 text-primary-terracotta" aria-hidden="true" />
      </motion.div>

      <motion.h3
        className="text-xl text-charcoal"
        style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400 }}
        initial={shouldReduceMotion ? {} : { opacity: 0, x: -8 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {label}
      </motion.h3>

      <motion.span
        className="px-2.5 py-0.5 rounded-full bg-warm-sand text-muted-brown text-xs font-medium"
        initial={shouldReduceMotion ? {} : { scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
      >
        {count}
      </motion.span>

      <div className="flex-1 overflow-hidden">
        <motion.div
          className="h-px bg-warm-sand/80"
          initial={shouldReduceMotion ? {} : { scaleX: 0, originX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CollegeDashboard({
  college,
  interns,
  attendance,
  onBack,
}: CollegeDashboardProps) {
  const shouldReduceMotion = useReducedMotion();
  const today = getToday();

  // Intern data for this college
  const collegeInterns = useMemo(
    () => interns.filter((r) => r[SCHOOL_IDX]?.trim() === college),
    [interns, college]
  );

  const internIds = useMemo(
    () => new Set(collegeInterns.map((r) => r[0])),
    [collegeInterns]
  );

  // All paired attendance for this college
  const allPairs = useMemo(
    () => pairAttendance(attendance, internIds),
    [attendance, internIds]
  );

  // Stats
  const todayPairs = allPairs.filter((p) => p.date === today);
  const checkedInToday = todayPairs.filter((p) => p.checkIn !== "—").length;
  const currentlyInside = todayPairs.filter(
    (p) => p.checkIn !== "—" && p.checkOut === "—"
  ).length;

  // Selected student
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // On mobile, toggle between list view and detail view
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  const handleMobileBack = () => {
    setMobileView("list");
  };

  // Draggable student order
  const [order, setOrder] = useState<string[]>(() => collegeInterns.map((r) => r[0]));
  useEffect(() => {
    setOrder(collegeInterns.map((r) => r[0]));
  }, [collegeInterns]);

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

  // Ordered intern list
  const orderedInterns = useMemo(() => {
    const map = Object.fromEntries(collegeInterns.map((r) => [r[0], r]));
    return order.map((id) => map[id]).filter(Boolean);
  }, [order, collegeInterns]);

  // Selected intern data
  const selectedIntern = selectedId
    ? collegeInterns.find((r) => r[0] === selectedId) ?? null
    : null;

  const selectedPairs = selectedId
    ? allPairs.filter((p) => p.internId === selectedId)
    : [];

  // Per-intern today status
  const todayStatusMap = useMemo(() => {
    const m: Record<string, { checkedIn: boolean; inside: boolean }> = {};
    for (const p of todayPairs) {
      m[p.internId] = {
        checkedIn: p.checkIn !== "—",
        inside: p.checkIn !== "—" && p.checkOut === "—",
      };
    }
    return m;
  }, [todayPairs]);

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Sticky Header ── */}
      <motion.header
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-warm-sand"
      >
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-brown hover:text-charcoal transition-colors shrink-0 group"
            aria-label="Back to college list"
          >
            <motion.span
              whileHover={shouldReduceMotion ? {} : { x: -2 }}
              transition={{ duration: 0.15 }}
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </motion.span>
            <span className="text-sm hidden sm:inline">Colleges</span>
          </button>
          <div className="w-px h-5 bg-warm-sand shrink-0" aria-hidden="true" />
          <h1
            className="text-base font-medium text-charcoal truncate"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            {college}
          </h1>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-5 py-8">

        {/* ── Hero heading ── */}
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mb-7"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-terracotta/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-terracotta" aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-brown tracking-wider">College Dashboard</p>
          </div>
          <h2
            className="text-3xl md:text-4xl text-charcoal"
            style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 400 }}
          >
            {college}
          </h2>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard icon={Users}    label="Total Interns"    value={collegeInterns.length} color="var(--primary-terracotta)" delay={0.12} />
          <StatCard icon={LogIn}    label="Today Check-Ins"  value={checkedInToday}        color="var(--success-green)"      delay={0.18} />
          <StatCard icon={Building2} label="Currently Inside" value={currentlyInside}       color="var(--muted-brown)"        delay={0.24} pulse />
        </div>

        {/* ── Profiles ── */}
        <motion.section
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mb-12"
        >
          <SectionHeading icon={Users} label="Intern Profiles" count={collegeInterns.length} />
          {collegeInterns.length === 0 ? (
            <p className="text-muted-brown text-center py-8">No interns for this college</p>
          ) : (
            <div className="columns-1 md:columns-2 gap-3">
              {collegeInterns.map((intern, i) => (
                <div key={intern[0]} className="break-inside-avoid mb-3">
                  <ProfileCard intern={intern} index={i} />
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Attendance ── */}
        <motion.section
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.34 }}
        >
          <SectionHeading icon={Calendar} label="Attendance" count={allPairs.length} />

          {/* Hint */}
          <motion.p
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-brown/40 mb-4 flex items-center gap-1.5"
          >
            <GripVertical className="w-3 h-3" aria-hidden="true" />
            Drag to reorder students · Click to view attendance
          </motion.p>

          {/* ── Mobile: list ↔ detail toggle ── */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {mobileView === "list" && (
                <motion.div
                  key="mobile-list"
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-2"
                >
                  {orderedInterns.map((intern, idx) => {
                    const status = todayStatusMap[intern[0]] ?? { checkedIn: false, inside: false };
                    return (
                      <StudentListItem
                        key={intern[0]}
                        intern={intern}
                        isSelected={selectedId === intern[0]}
                        isCheckedInToday={status.checkedIn}
                        isInsideNow={status.inside}
                        isDragging={draggingIdx === idx}
                        onSelect={() => handleSelect(intern[0])}
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        index={idx}
                      />
                    );
                  })}
                </motion.div>
              )}

              {mobileView === "detail" && (
                <motion.div
                  key="mobile-detail"
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.28 }}
                >
                  <button
                    onClick={handleMobileBack}
                    className="flex items-center gap-1.5 text-sm text-muted-brown hover:text-charcoal mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    Back to students
                  </button>
                  <AttendanceDetail intern={selectedIntern} pairs={selectedPairs} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Desktop: side-by-side ── */}
          <div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Student list */}
            <div className="space-y-2 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pb-4 scrollbar-hide">
              {orderedInterns.map((intern, idx) => {
                const status = todayStatusMap[intern[0]] ?? { checkedIn: false, inside: false };
                return (
                  <StudentListItem
                    key={intern[0]}
                    intern={intern}
                    isSelected={selectedId === intern[0]}
                    isCheckedInToday={status.checkedIn}
                    isInsideNow={status.inside}
                    isDragging={draggingIdx === idx}
                    onSelect={() => handleSelect(intern[0])}
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    index={idx}
                  />
                );
              })}
            </div>

            {/* Attendance detail */}
            <div>
              <AttendanceDetail intern={selectedIntern} pairs={selectedPairs} />
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
