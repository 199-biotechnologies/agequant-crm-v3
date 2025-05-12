/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // Restore strict linting
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
