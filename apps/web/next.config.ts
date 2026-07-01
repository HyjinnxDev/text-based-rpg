import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    transpilePackages: [
    "@tbrpg/db",
    "@tbrpg/shared",
    "@tbrpg/domain",
    "@tbrpg/ai",
    "@tbrpg/storage",
    "@tbrpg/realtime",
  ],
};

export default nextConfig;
