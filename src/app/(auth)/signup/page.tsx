export const dynamic = "force-dynamic";

import { SignUpForm } from "@/components/auth/signup-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return <SignUpForm redirectTo={params.redirect} />;
}
