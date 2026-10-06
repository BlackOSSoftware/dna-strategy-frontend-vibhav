const backend = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
const config = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default config;
