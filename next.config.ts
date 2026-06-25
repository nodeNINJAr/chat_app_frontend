import type { NextConfig } from "next";

// Message attachments are served from our own backend (PUBLIC_API_URL), so
// this is the only remote host that's safe to let next/image proxy/optimize
// — unlike user-pasted avatar URLs, which are arbitrary external links and
// stay as plain <img> to avoid letting the image optimizer fetch arbitrary,
// user-controlled origins (SSRF risk).
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
      },
    ],
  },
};

export default nextConfig;
