/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: false
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const normalizedUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
    return [
      {
        source: '/api/v1/:path*',
        destination: `${normalizedUrl}/api/v1/:path*` // Proxy to Backend
      }
    ]
  }
};

export default nextConfig;
