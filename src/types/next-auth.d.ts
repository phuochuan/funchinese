import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      keycloakId: string;
      role: "teacher" | "student";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    keycloakId: string;
    role: "teacher" | "student";
    picture: string | null;
  }
}