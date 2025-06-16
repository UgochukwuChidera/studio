
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google Sign-In user photos
        port: '',
        pathname: '/**',
      },
      // Supabase Storage remote pattern for NEW project
      {
       protocol: 'https',
       hostname: 'plxdypsqpxgzddkoxlrn.supabase.co', // Your NEW Supabase project reference
       port: '',
       pathname: '/storage/v1/object/public/**', 
      }
    ],
  },
};

export default nextConfig;
