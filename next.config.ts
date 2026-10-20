import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: 'export'` (static export) is incompatible with the API
  // routes under src/app/api (provisioning, telemetry, snapshots) because
  // those need a live server. A standard server build is used instead.
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['routeros-client', 'node-routeros', 'source-map-support'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
