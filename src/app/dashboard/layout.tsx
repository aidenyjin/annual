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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar
        classes={classes ?? []}
        email={user.email ?? ""}
        logoutAction={logout}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
