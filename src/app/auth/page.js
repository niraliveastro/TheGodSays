import { redirect } from "next/navigation";

/**
 * Auth root: always redirect to user sign-in.
 * Only /auth/user and /auth/astrologer are used as entry points.
 */
export default function AuthPage() {
  redirect("/auth/user");
}
