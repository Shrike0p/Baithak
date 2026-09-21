import type { NextConfig } from "next";

// Rewrites are baked into a static manifest at BUILD time, so this has to
// resolve during the build — not at runtime. A Vercel env var that the build
// can't see falls through to the localhost default and every /api/* request
// then fails with DNS_HOSTNAME_RESOLVED_PRIVATE. VERCEL_ENV is always present
// during a Vercel build, so it's the reliable signal for "not local".
const API_ORIGIN =
  process.env.API_ORIGIN ??
  (process.env.VERCEL_ENV ? "https://api.baithak.buzz" : "http://localhost:3001");

const nextConfig: NextConfig = {
  images: {
    // Uploaded photos come from Supabase Storage and social avatars from the
    // provider. Seeded images are local files and need no entry here.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Better Auth copies the provider's avatar into User.image on a social
      // sign-in, so the photo is served from Google, not from us. The
      // subdomain varies (lh3, lh4, lh5…), hence the wildcard.
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },

  // Browser calls /api/* same-origin and Next proxies to apps/api — avoids CORS
  // entirely instead of adding headers + preflight handling to every route.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
