import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') || 
                       req.nextUrl.pathname.startsWith('/signup');
  
  // Allow API routes to handle their own authentication
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  
  // Redirect to login if not authenticated and not on auth route or API route
  if (!user && !isAuthRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to projects if authenticated and on auth route
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/projets', req.url));
  }

  return response;
}

