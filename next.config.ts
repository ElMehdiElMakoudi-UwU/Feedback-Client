import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next's built-in gzip compression buffers response chunks until its
  // internal buffer fills (or the stream ends) before flushing them to the
  // client. That holds back every `data: ...` chunk on the order SSE stream
  // (src/app/api/orders/stream/route.ts) until the connection closes, so
  // the cashier/customer dashboards only see new orders after a manual
  // refresh — the X-Accel-Buffering header alone doesn't fix this because
  // it only tells nginx-style proxies not to buffer; it does nothing about
  // buffering inside the Next.js server itself. The reverse proxy in front
  // of the app (Coolify's Traefik) already compresses responses, so this is
  // safe to turn off here.
  compress: false,
  images: {
    // The built-in optimizer (sharp) mangles the gold-gradient PNGs in
    // public/brand/ into near-black output. All next/image usage in this
    // app is these local, already-small brand assets, so skip it.
    unoptimized: true,
  },
};

export default nextConfig;
