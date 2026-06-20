/** @type {import('next').NextConfig} */

// All browser calls hit same-origin /api/* and are proxied to the FastAPI backend.
// Locally that's uvicorn on :8000; on Vercel set PULSE_API_BASE to the tunnel URL.
const apiBase = (process.env.PULSE_API_BASE ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
    ];
  },
};

export default nextConfig;
