/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@grimoire/api", "@grimoire/db", "@grimoire/shared"],
}

export default nextConfig
