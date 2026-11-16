/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets local builds write somewhere other than .next (e.g. NEXT_DIST_DIR=.next-build)
  // so they never clobber a running `next start`. Vercel leaves this unset.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: {
    // Linter is satisfied locally; skip during CI/production builds.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type-checking runs in the editor; skip during production builds.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
