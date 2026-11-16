/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets local builds write somewhere other than .next (e.g. NEXT_DIST_DIR=.next-build)
  // so they never clobber a running `next start`. Vercel leaves this unset.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
