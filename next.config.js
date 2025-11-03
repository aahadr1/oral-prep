/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude canvas from client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false,
      };
    } else {
      // Server-side: allow canvas
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'canvas',
      });
    }
    
    // Handle binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },
}

module.exports = nextConfig

