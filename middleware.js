import { NextResponse } from 'next/server';

const COOKIE_NAME = 'nuttiness_session';
const LOGIN_PATH = '/login';
const TOKEN_PAYLOAD = 'authenticated';

function isPublicPath(pathname) {
  if (pathname === LOGIN_PATH || pathname.startsWith('/login/')) return true;
  if (pathname === '/api/auth/login') return true;
  if (pathname === '/api/auth/logout') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/icons/')) return true;
  if (pathname === '/manifest.json') return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname === '/karu-logo.png') return true;
  return false;
}

async function computeExpectedToken(secret) {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(TOKEN_PAYLOAD));
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${TOKEN_PAYLOAD}.${hex}`;
}

async function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const expected = await computeExpectedToken(secret);
  return token === expected;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value ?? '';
  const secret = process.env.SESSION_SECRET || '';

  const authenticated = await verifySessionToken(token, secret);

  if (pathname === LOGIN_PATH || pathname.startsWith('/login/')) {
    if (authenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)']
};
