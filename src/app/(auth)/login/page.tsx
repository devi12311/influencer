export const dynamic = "force-dynamic";

import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return <LoginForm redirectTo={params.redirect} />;
}
