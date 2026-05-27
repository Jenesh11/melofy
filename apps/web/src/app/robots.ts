import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/settings',
        '/pip',
        '/desktop-login',
        '/github',
        '/playing',
        '/listen/',
      ],
    },
    sitemap: 'https://melofy.jene.in/sitemap.xml',
  };
}
