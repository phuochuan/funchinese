"use server";

import { signOut } from "@/auth";

export async function keycloakSignOut() {
  // Clears NextAuth session server-side.
  // The browser-side caller is responsible for navigating to /api/auth/logout.
  await signOut({ redirect: false });
}
