/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gamexamxi/shared'],
  eslint: {
    // ESLint 10 (hoisted by pnpm) incompatible with Next.js 14 built-in linting.
    // Lint is handled separately via `pnpm lint`. Skip during build.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
