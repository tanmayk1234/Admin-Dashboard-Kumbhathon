"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, User } from "lucide-react";
import { useState } from "react";

interface InternCardProps {
  intern: string[];
  attendance?: string[][];
}

export default function InternCard({ intern, attendance = [] }: InternCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const [id, name, phone, email, title, school, period, joinDate] = intern;

  return (
    <motion.div
      className="bg-white rounded-[16px] shadow-card overflow-hidden"
      layout={!shouldReduceMotion}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-warm-sand/30 transition-colors"
        aria-expanded={expanded}
        aria-label={`${name} - ${title}`}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--warm-sand)" }}
        >
          <User className="w-5 h-5 text-muted-brown" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-charcoal truncate">{name}</p>
          <p className="text-sm text-muted-brown font-mono">{id}</p>
        </div>

        <div className="hidden sm:block text-right mr-4">
          <p className="text-sm text-muted-brown">{title}</p>
          <p className="text-xs text-muted-brown/70">{school}</p>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-brown" aria-hidden="true" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 border-t border-warm-sand/50">
              {/* Intern details */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                <div>
                  <p className="text-muted-brown text-xs uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-charcoal">{email}</p>
                </div>
                <div>
                  <p className="text-muted-brown text-xs uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-charcoal">{phone}</p>
                </div>
                <div>
                  <p className="text-muted-brown text-xs uppercase tracking-wider mb-1">
                    Period
                  </p>
                  <p className="text-charcoal">{period}</p>
                </div>
                <div>
                  <p className="text-muted-brown text-xs uppercase tracking-wider mb-1">
                    Joining Date
                  </p>
                  <p className="text-charcoal">{joinDate}</p>
                </div>
              </div>

              {/* Attendance History */}
              {attendance.length > 0 && (
                <div className="mt-4">
                  <p className="text-muted-brown text-xs uppercase tracking-wider mb-2">
                    Recent Attendance
                  </p>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {attendance.slice(0, 10).map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-cream/50"
                      >
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                            row[3] === "CHECK_IN"
                              ? "bg-success-green/10 text-success-green"
                              : "bg-primary-terracotta/10 text-primary-terracotta"
                          }`}
                        >
                          {row[3]}
                        </span>
                        <span className="text-muted-brown">
                          {row[4]} at {row[5]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
