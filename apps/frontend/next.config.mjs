/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@darketing/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
