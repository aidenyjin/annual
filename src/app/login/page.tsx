import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        action={login}
        className="w-full max-w-sm flex flex-col gap-4 border border-black/10 dark:border-white/10 rounded-xl p-6"
      >
        <h1 className="text-xl font-semibold">Log in</h1>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-foreground text-background py-2 font-medium"
        >
          Log in
        </button>

        <p className="text-sm text-center">
          No account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
