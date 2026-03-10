import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/stream',
        destination: 'http://localhost:3001/api/stream',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
      {
        source: '/api/spotify/:path*',
        destination: 'http://localhost:3001/api/spotify/:path*',
      },
    ];
  },
};

export default nextConfig;
