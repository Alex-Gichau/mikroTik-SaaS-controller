import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['routeros-client', 'node-routeros', 'source-map-support'],
};

export default nextConfig;
