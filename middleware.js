import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow Next internals, API routes, and static assets (including icons/images, manifest, SW)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.webmanifest') ||
    pathname.includes('.') // any file with an extension (e.g., .png, .json, .ico, .js)
  ) {
    return NextResponse.next();
  }

  // SPA fallback: rewrite everything else to the app shell
  return NextResponse.rewrite(new URL('/', req.url));
}

export const config = { matcher: '/:path*' };
