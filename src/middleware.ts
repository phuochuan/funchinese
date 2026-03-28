import { auth } from "@/auth";
import { NextResponse } from "next/server";

const STATIC_RE = /\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|otf|mp4|webm)$/;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // ✅ Serve static files directly — no auth, no redirect
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    STATIC_RE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  const isLoggedIn = !!session;

  const role = session?.user?.role?.toLowerCase();

  // Public routes
  const publicRoutes = ["/", "/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  // Redirect after login
  if (isLoggedIn && (pathname === "/" || pathname === "/login")) {
    const dest = role === "teacher" ? "/home/teacher" : "/home/student";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Protect /home
  if (pathname.startsWith("/home")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname.startsWith("/home/teacher") && role !== "teacher") {
      return NextResponse.redirect(new URL("/home/student", req.url));
    }

    if (pathname.startsWith("/home/student") && role !== "student") {
      return NextResponse.redirect(new URL("/home/teacher", req.url));
    }
  }

  // Protect /admin
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (role !== "teacher") {
      return NextResponse.redirect(new URL("/home/student", req.url));
    }
  }

  // Default: require login
  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};