import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Enable standalone output for Docker deployment
  // This creates a minimal Node.js server in .next/standalone
  output: "standalone",
  
  // Disable telemetry in production
  ...(process.env.NODE_ENV === "production" && {
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
