// server/routes/robots.txt.ts
import { defineEventHandler, setResponseHeader } from 'h3';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400');
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /linimasa',
    'Disallow: /admin/',
    'Disallow: /api/admin/',
    'Disallow: /login',
    '',
    'Sitemap: https://sipena6503.caplinlab.my.id/sitemap.xml',
  ].join('\n');
});
