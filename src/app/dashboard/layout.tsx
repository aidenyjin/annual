import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logout } from "./logout-action";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl">
        <Link href="/dashboard" className="font-serif text-lg text-foreground">
          Annual
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{user.email}</span>
          <form action={logout}>
            <SubmitButton variant="ghost" pendingText="Logging out…" className="px-3 py-1.5">
              Log out
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
