import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  async rewrites() {
    return [
      {
        source: '/.well-known/:path*',
        destination: '/api/well-known/:path*',
      },
    ];
  },
  serverExternalPackages: [
    'thread-stream',
    'pino',
    'pino-worker',
    'pino-file',
    'pino-pretty',
  ],
  turbopack: {
    root: './',
  },
  // Strip data-test-id attributes in production builds only.
  // Playwright sets E2E=1 via the webServer command so attributes are preserved during e2e runs.
  compiler: {
    reactRemoveProperties:
      process.env.NODE_ENV === 'production'
        ? { properties: ['^data-test-id$'] }
        : undefined,
  },
};

export default nextConfig;
