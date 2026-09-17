import type { NextConfig } from 'next';

const githubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  ...(githubPages ? {
    output: 'export',
    assetPrefix: '/nsrd-dati',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
