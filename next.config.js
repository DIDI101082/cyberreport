/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['jspdf', 'pptxgenjs'],
  },
}

module.exports = nextConfig
