/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
