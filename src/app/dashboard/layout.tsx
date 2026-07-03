import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { logout } from "./logout-action";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getSession() reads the already-verified session from cookies locally —
  // no network round trip to Supabase's auth server. The real gate is the
  // proxy middleware's getUser() check (which does verify), plus RLS on
  // every query below; this is just for display + query scoping.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar
        classes={classes ?? []}
        email={session.user.email ?? ""}
        logoutAction={logout}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
