import type { NextConfig } from "next";

const backendBaseUrl = (
  process.env.BACKEND_API_URL || 
  'http://api:3001'           // Docker Compose service name — safe fallback inside container
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://api:3001',
    '192.168.29.192',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-ak.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-fa.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'images-ak.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
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
        source: '/api/socket.io',
        destination: `${backendBaseUrl}/api/socket.io`,
      },
      {
        source: '/api/socket.io/:path*',
        destination: `${backendBaseUrl}/api/socket.io/:path*`,
      },
      {
        source: '/api/spotify/:path*',
        destination: `${backendBaseUrl}/api/spotify/:path*`,
      },
      {
        source: '/api/lyrics',
        destination: `${backendBaseUrl}/api/lyrics`,
      },
      {
        source: '/api/search',
        destination: `${backendBaseUrl}/api/search`,
      },
      {
        source: '/api/recommendations',
        destination: `${backendBaseUrl}/api/recommendations`,
      },
      {
        source: '/api/player/:path*',
        destination: `${backendBaseUrl}/api/player/:path*`,
      },
      {
        source: '/api/jam/:path*',
        destination: `${backendBaseUrl}/api/jam/:path*`,
      },
      {
        source: '/api/health',
        destination: `${backendBaseUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
