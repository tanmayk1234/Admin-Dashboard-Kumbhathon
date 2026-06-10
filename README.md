# Admin Dashboard — Kumbhathon Attendance System

A password-protected admin dashboard for the Kumbhathon intern attendance system. Built with Next.js, TypeScript, and TailwindCSS, powered by Google Sheets as the live database.

## Features

- **Password-protected access** — Secure admin login with session management
- **College Picker** — Browse interns grouped by college with search
- **College Dashboard** — Per-college drill-down with real-time stats
  - Total Interns, Today's Check-Ins, Currently Inside (animated counters)
  - Expandable intern profile cards (masonry layout)
  - Per-student attendance table with check-in/out times, duration, and GPS
  - Drag-to-reorder student list
  - Excel export per student
- **Auto-refresh** — Dashboard data refreshes every 30 seconds
- **Responsive** — Mobile list/detail toggle, desktop side-by-side view

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** TailwindCSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Database:** Google Sheets API v4 (Service Account)
- **Export:** SheetJS (xlsx)

## Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/tanmayk1234/Admin-Dashboard-Kumbhathon.git
   cd Admin-Dashboard-Kumbhathon
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Google Sheets credentials and admin password in `.env.local`.

4. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) — it redirects to `/admin`.

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Service Account JSON (local dev) |
| `GOOGLE_CLIENT_EMAIL` | Service Account email (Vercel deployment) |
| `GOOGLE_PRIVATE_KEY` | Service Account private key (Vercel deployment) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets spreadsheet ID |
| `ADMIN_PASSWORD` | Password for the admin dashboard |

## Deployment

Deploy to Vercel with one click. Set the environment variables in the Vercel dashboard.
