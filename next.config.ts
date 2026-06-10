import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose office location as public env vars for client-side geolocation
  env: {
    NEXT_PUBLIC_OFFICE_LATITUDE: process.env.OFFICE_LATITUDE,
    NEXT_PUBLIC_OFFICE_LONGITUDE: process.env.OFFICE_LONGITUDE,
    NEXT_PUBLIC_OFFICE_RADIUS_METERS: process.env.OFFICE_RADIUS_METERS,
  },
};

export default nextConfig;
