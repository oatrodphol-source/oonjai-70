import type { NextConfig } from "next";

// @ts-expect-error - missing types
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: any = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig);
