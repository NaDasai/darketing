/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@eagle-eyes/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
