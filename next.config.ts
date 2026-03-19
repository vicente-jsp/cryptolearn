/** @type {import('next').NextConfig} */
const nextConfig = {

  // Only keep the ignore settings if you are still having build errors
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            // CHANGE 'require-corp' TO 'credentialless'
            value: 'credentialless', 
          },
        ],
      },
    ];
  },
};

export default nextConfig;