import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // xmllint-wasm ships a .wasm binary and uses worker_threads. Exclude it from
  // the Next.js server bundle so it is resolved via node_modules at runtime.
  serverExternalPackages: ['xmllint-wasm'],

  // Make sure the official SIX pain.001 XSD travels with the serverless function.
  outputFileTracingIncludes: {
    '/api/payment-runs/*/export': ['./src/lib/pain001/schemas/**/*.xsd'],
  },

  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

export default withNextIntl(nextConfig);
