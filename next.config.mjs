/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// 참고: app/layout.tsx의 인라인 테마 초기화 스크립트와 Next/Tailwind가 주입하는
// 인라인 스타일 때문에 'unsafe-inline'을 허용하는 실용적(pragmatic) 기본선이다.
// 추후 nonce 기반 CSP로 강화할 수 있다 (script-src에 nonce-* 추가 + strict-dynamic).
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"; // dev: Next.js HMR에 unsafe-eval 필요

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// HSTS는 프로덕션(HTTPS)에서만 적용한다. 로컬 http 개발 환경까지 https로 강제하지 않기 위함.
if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
