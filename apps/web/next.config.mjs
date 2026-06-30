/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Force Next.js to transpile workspace type dependencies if they contain raw TS
  transpilePackages: ['@campus-crave/shared-types'],
};

export default nextConfig;
