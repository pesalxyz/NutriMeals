import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriMeals',
    short_name: 'NutriMeals',
    description: 'Scan. Eat. Know.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#22c55e',
    icons: [
      {
        src: '/branding/icons/nutrimeals-icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/branding/icons/nutrimeals-icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
}
