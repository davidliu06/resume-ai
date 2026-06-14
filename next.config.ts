import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
