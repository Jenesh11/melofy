import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/stream',
        destination: `${backendBaseUrl}/api/stream`,
      },
      {
        source: '/api/stream-ticket',
        destination: `${backendBaseUrl}/api/stream-ticket`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendBaseUrl}/socket.io/:path*`,
      },
      {
        source: '/api/spotify/:path*',
        destination: `${backendBaseUrl}/api/spotify/:path*`,
      },
      {
        source: '/api/lyrics',
        destination: `${backendBaseUrl}/api/lyrics`,
      },
    ];
  },
};

export default nextConfig;
