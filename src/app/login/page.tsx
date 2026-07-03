import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <form action={login} className="flex flex-col gap-5">
          <h1 className="font-serif text-2xl text-foreground">Log in</h1>

          {error && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Email
            <Input name="email" type="email" required />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Password
            <Input name="password" type="password" required />
          </label>

          <SubmitButton pendingText="Logging in…" className="mt-1 w-full">
            Log in
          </SubmitButton>

          <p className="text-center text-sm text-muted">
            No account?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
