import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"), // Ou simplement __dirname si ça suffit
  // ... tes autres configs
};

export default nextConfig;