// src/components/auth/LoginButton.tsx
import { signIn } from "@/auth"
import { keycloakSignOut } from "@/actions/auth"

export function LoginButton() {
  return (
    <form action={async () => { "use server"; await signIn("keycloak") }}>
      <button type="submit">Đăng nhập với Keycloak</button>
    </form>
  )
}

export function LogoutButton() {
  return (
    <form action={async () => { "use server"; await keycloakSignOut() }}>
      <button type="submit">Đăng xuất</button>
    </form>
  )
}
