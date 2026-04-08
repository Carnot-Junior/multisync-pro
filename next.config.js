/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Impede o site de ser embebido em iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Impede o browser de adivinhar o tipo de conteúdo
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Força HTTPS em produção (1 ano)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Desactiva o filtro XSS antigo (usar CSP em vez disso)
          { key: 'X-XSS-Protection', value: '0' },
          // Política de referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restringe acesso a funcionalidades do browser
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-eval necessário para Next.js dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://api.proxypay.co.ao https://api.sandbox.proxypay.co.ao",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Headers para ficheiros de download
      {
        source: '/files/(.*)',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
