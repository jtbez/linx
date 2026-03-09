import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@adonisjs/http-server"],
  transpilePackages: ["@linxhq/sdk", "@linxhq/core"],
  webpack: (config) => {
    // SDK uses .js extensions in imports (Node ESM convention) but source is .ts
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
