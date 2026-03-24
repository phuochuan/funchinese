// src/app/home/teacher/page.tsx
// Teacher được redirect thẳng vào /admin
import { redirect } from "next/navigation";

export default function TeacherHomePage() {
  redirect("/admin");
}
