import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@grimoire/api", "@grimoire/db", "@grimoire/shared"],
}

export default nextConfig
