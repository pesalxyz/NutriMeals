import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register'];
const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/scan',
  '/result',
  '/history',
  '/profile',
  '/settings',
  '/onboarding',
  '/api-keys',
  '/meals'
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isNextStaticPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('nutriscan_token')?.value;
  const tokenValid = Boolean(token && !isTokenExpired(token));
  const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isProtected && !tokenValid) {
    const loginUrl = new URL('/login', request.url);
    const redirectTarget = `${pathname}${search}`;
    loginUrl.searchParams.set('next', redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && tokenValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublic || isProtected) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|branding|.*\\..*).*)']
};

function isNextStaticPath(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/favicon.ico' || pathname.startsWith('/branding');
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(base64UrlDecode(parts[1] ?? ''));
    const exp = Number(payload?.exp ?? 0);
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
