import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // The built-in optimizer (sharp) mangles the gold-gradient PNGs in
    // public/brand/ into near-black output. All next/image usage in this
    // app is these local, already-small brand assets, so skip it.
    unoptimized: true,
  },
};

export default nextConfig;
