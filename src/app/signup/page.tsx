import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <form action={signup} className="flex flex-col gap-5">
          <h1 className="font-serif text-2xl text-foreground">Sign up</h1>

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
            <Input name="password" type="password" required minLength={6} />
          </label>

          <SubmitButton pendingText="Signing up…" className="mt-1 w-full">
            Sign up
          </SubmitButton>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
