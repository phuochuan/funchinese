import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;

  // lowercase để khớp với role name trong Keycloak
  const role = session?.user?.role?.toLowerCase();

  const publicRoutes = ["/", "/login", "/register"];
  const isPublic = publicRoutes.includes(pathname);

  if (isLoggedIn && (pathname === "/" || pathname === "/login")) {
    const dest = role === "teacher" ? "/home/teacher" : "/home/student";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Bảo vệ /home/*
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

  // Bảo vệ /admin/* — chỉ teacher
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "teacher") {
      return NextResponse.redirect(new URL("/home/student", req.url));
    }
  }

  // Các route khác cần đăng nhập
  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};