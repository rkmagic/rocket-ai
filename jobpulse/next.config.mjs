/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15+: was experimental.serverComponentsExternalPackages
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
