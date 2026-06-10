import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import GrainOverlay from "@/components/GrainOverlay";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Kumbhathon Intern Check-In Portal",
  description:
    "Track intern attendance via QR scan and geolocation verification at Kumbhathon Innovation Foundation.",
  openGraph: {
    title: "Kumbhathon Intern Check-In Portal",
    description:
      "Daily check-in and check-out system for Kumbhathon Innovation Foundation interns.",
    siteName: "Kumbhathon Portal",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GrainOverlay />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--charcoal)",
              color: "var(--cream)",
              border: "none",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
