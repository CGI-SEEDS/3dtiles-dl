/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add support for GLB/GLTF files
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/models/',
          outputPath: 'static/models/',
          name: '[name].[hash].[ext]',
        },
      },
    });
    return config;
  },
  // Enable static file serving for tiles directory
  async rewrites() {
    return [
      {
        source: '/tiles/:path*',
        destination: '/tiles/:path*',
      },
      {
        source: '/data/:path*',
        destination: '/data/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
