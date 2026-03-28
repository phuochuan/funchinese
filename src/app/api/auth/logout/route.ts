import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

const KEYCLOAK_ISSUER  = process.env.KEYCLOAK_ISSUER!;
const APP_URL          = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID!;

export async function GET(req: NextRequest) {
  // Grab id_token_hint from cookie if present (stored during signIn)
  const sessionCookie = req.cookies.get("authjs.session-token")
    ?? req.cookies.get("__Secure-authjs.session-token");
  const idTokenHint = (sessionCookie as any)?.value
    ? undefined  // token not directly usable as id_token_hint; omit for simplicity
    : undefined;

  // 1. Clear NextAuth session server-side
  await signOut({ redirect: false });

  // 2. Build Keycloak logout URL — the browser must visit this with its cookies
  const params = new URLSearchParams({
    client_id:                KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: APP_URL,
    ...(idTokenHint ? { id_token_hint: idTokenHint } : {}),
  });
  const keycloakLogoutUrl = `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout?${params}`;

  // 3. Browser visits Keycloak → session cookie cleared → redirect back to APP_URL
  return NextResponse.redirect(keycloakLogoutUrl);
}
