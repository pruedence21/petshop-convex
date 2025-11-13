import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker container monitoring
 * Used by Docker healthcheck and load balancers
 */
export async function GET() {
  try {
    // Basic health check - application is responding
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    // If any error occurs, return unhealthy status
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
