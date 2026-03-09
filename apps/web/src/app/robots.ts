import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings'],
    },
    sitemap: 'https://melofy.vercel.app/sitemap.xml',
  };
}
