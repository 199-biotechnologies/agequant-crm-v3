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
  // Configure to properly handle PDF generation API routes
  serverExternalPackages: ['pdfmake'],
}

export default nextConfig
