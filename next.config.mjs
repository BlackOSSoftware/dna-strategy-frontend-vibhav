const backend = process.env.BACKEND_URL || 'http://127.0.0.1:4000';

/** @type {import('next').NextConfig} */
const config = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {source:'/', headers:[{key:'Cache-Control', value:'no-store'}]},
      {source:'/dashboard.js', headers:[{key:'Cache-Control', value:'no-cache'}]}
    ];
  },
};

export default config;
