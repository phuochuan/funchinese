import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId:     process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer:       process.env.KEYCLOAK_ISSUER!,
    }),
  ],

  callbacks: {
    // Chạy ngay sau khi Keycloak xác thực xong
  async signIn({ account, profile }) {
  if (!profile?.sub) return false;

  const keycloakId = profile.sub;
  const email      = (profile.email as string) ?? "";
  const name       = (profile.name as string) ?? (profile.preferred_username as string) ?? "Học viên";
  const image      = (profile.picture as string) ?? null;
  const roles      = (profile as any).realm_access?.roles ?? [];
  const role       = roles.includes("teacher") ? "teacher" : "student";

  try {
    // Tìm theo email trước (bắt cả user từ seed chưa có keycloakId)
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Đã có → chỉ cập nhật keycloakId nếu chưa set
      await prisma.user.update({
        where: { email },
        data: {
          keycloakId: existing.keycloakId ?? keycloakId,
          name,
          image,
        },
      });
    } else {
      // Chưa có → tạo mới
      await prisma.user.create({
        data: { keycloakId, email, name, image, role },
      });
    }

    console.log(`[auth] ${email} (${role}) logged in`);
  } catch (err) {
    console.error("[auth] DB error:", err);
    return false;
  }

  return true;
},

    // Ghi thông tin vào JWT
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const roles = (profile as any).realm_access?.roles ?? [];
        console.log("[auth] Keycloak roles:", roles);

        token.keycloakId = profile.sub;
        token.role       = roles.includes("teacher") ? "teacher" : "student";
        token.email      = profile.email as string;
        token.name       = (profile.name ?? profile.preferred_username) as string;
        token.picture    = (profile.picture as string) ?? null;
      }
      return token;
    },

    // Đưa vào Session để dùng ở mọi nơi
    async session({ session, token }) {
      session.user.keycloakId = token.keycloakId as string;
      session.user.role       = token.role as "teacher" | "student";
      session.user.name       = token.name  as string;
      session.user.email      = token.email as string;
      session.user.image      = (token.picture as string) ?? null;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
});