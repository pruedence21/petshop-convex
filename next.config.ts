import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Enable standalone output for Docker deployment only
  // This creates a minimal Node.js server in .next/standalone
  // For Vercel deployment, this is automatically handled
  ...(process.env.DOCKER_BUILD === "true" && {
    output: "standalone",
  }),
  
  // Disable telemetry in production
  ...(process.env.NODE_ENV === "production" && {
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
