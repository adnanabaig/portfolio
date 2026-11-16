const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets local builds write somewhere other than .next (e.g. NEXT_DIST_DIR=.next-build)
  // so they never clobber a running `next start`. Vercel leaves this unset.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack(config) {
    // Private notes and hidden entries never ship to the browser.
    config.module.rules.push({
      test: /[\\/]data[\\/]portfolio\.json$/,
      use: [path.join(__dirname, "scripts/strip-private-loader.cjs")],
    });
    return config;
  },
};

module.exports = nextConfig;
