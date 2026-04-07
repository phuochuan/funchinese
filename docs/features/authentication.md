# Authentication System

## Overview

Dùng **NextAuth.js v5 (Auth.js)** với **Keycloak** làm Identity Provider (IdP). Hỗ trợ SSO qua Keycloak + Google OAuth.

## Architecture

```
User Browser
     │
     ▼
┌─────────────────┐
│  /login page    │ ← Server Component renders LoginButton
└────────┬────────┘
         │ click "Sign in with Keycloak"
         ▼
┌─────────────────┐
│  Keycloak       │ ← SSO page (or Google OAuth)
│  IdP Server     │
└────────┬────────┘
         │ callback with code
         ▼
┌─────────────────┐
│ /api/auth/      │ ← NextAuth handlers
│ [...nextauth]   │   - KeycloakProvider exchanges code
│                 │   - signIn callback: find/create User
└────────┬────────┘
         │ session JWT
         ▼
┌─────────────────┐
│  App (logged in)│
└─────────────────┘
```

## Auth Config (`src/auth.ts`)

```ts
import NextAuth from "next-auth"
import KeycloakProvider from "next-auth/providers/keycloak"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    // Khi nhận callback từ Keycloak
    async signIn({ user, account, profile }) {
      // user.email = email từ Keycloak
      // Tìm hoặc tạo User trong DB
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      })

      if (!dbUser) {
        // Tạo user mới
        const role = profile?.realm_access?.roles?.includes("teacher")
          ? "teacher" : "student"
        await prisma.user.create({
          data: {
            email: user.email!,
            name: user.name ?? user.email!,
            image: user.image,
            keycloakId: profile?.sub,
            role,
          }
        })
      } else {
        // Update keycloakId + info nếu changed
        await prisma.user.update({
          where: { email: user.email },
          data: { keycloakId: profile?.sub, image: user.image, name: user.name }
        })
      }
      return true
    },

    // Encode vào JWT token
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.keycloakId = profile.sub
        token.role = profile.realm_access?.roles?.includes("teacher")
          ? "teacher" : "student"
      }
      return token
    },

    // Expose trong session
    async session({ session, token }) {
      session.user.keycloakId = token.keycloakId
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
```

## Session Shape

```ts
// src/types/next-auth.d.ts
declare module "next-auth" {
  interface Session {
    user: {
      keycloakId: string
      role: "student" | "teacher"
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

## Middleware (`src/middleware.ts`)

```ts
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/home/:path*", "/admin/:path*"],
}
```

Logic trong middleware:
```
1. Nếu chưa login → redirect /login
2. /admin/* → chỉ teacher được vào
3. /home/student/* → chỉ student được vào
4. Redirect: / → /home/student hoặc /home/teacher
```

**Public routes:** `/`, `/login`, `/register`, `/_next`, `/uploads`, static files.

## Server-Side Auth Check

```ts
// Student API
const session = await auth()
if (!session?.user?.keycloakId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
const dbUser = await prisma.user.findUnique({
  where: { keycloakId: session.user.keycloakId }
})
const userId = dbUser.id

// Teacher API
if (session?.user?.role !== "teacher") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

## Logout

### Client Logout (`src/actions/auth.ts`)
```ts
"use server"
export async function keycloakSignOut() {
  await signOut({ redirect: false })
  redirect("/api/auth/logout")
}
```

### Server Logout Handler (`/api/auth/logout`)
```ts
// Gọi Keycloak logout endpoint
const keycloakLogoutUrl = new URL(
  `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`
)
keycloakLogoutUrl.searchParams.set(
  "post_logout_redirect_uri",
  process.env.NEXTAUTH_URL
)
redirect(keycloakLogoutUrl.toString())
```

## Keycloak Configuration

Trong Keycloak realm:
1. **Client ID:** `funchinese`
2. **Protocol:** openid-connect
3. **Access Type:** confidential
4. **Valid Redirect URIs:** `http://localhost:3000/api/auth/callback/keycloak`
5. **Web Origins:** `http://localhost:3000`
6. **Roles:** `teacher`, `student` (map từ realm roles)

```
KEYCLOAK_ISSUER="http://localhost:8080/realms/master"
// Issuer URL format: {keycloak-host}/realms/{realm-name}
```

## Environment Variables

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random-secret-string"
KEYCLOAK_CLIENT_ID="funchinese"
KEYCLOAK_CLIENT_SECRET="..."
KEYCLOAK_ISSUER="http://localhost:8080/realms/master"
```

## User Registration Flow

Không có form đăng ký riêng. User đăng nhập lần đầu qua Keycloak → tự động tạo User record với role mặc định `student`. Teacher được tạo bằng cách gán role `teacher` trong Keycloak.
