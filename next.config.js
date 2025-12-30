/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize for production builds
  swcMinify: true,
  // Disable eval in production for CSP compliance
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Disable eval in production
    if (!dev) {
      config.output.globalObject = 'globalThis'
      config.optimization = {
        ...config.optimization,
        minimize: true,
      }
    }
    
    return config
  },
}

module.exports = nextConfig

