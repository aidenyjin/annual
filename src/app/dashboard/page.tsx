import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClass } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, term")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Your classes</h1>
        {classes && classes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {classes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/classes/${c.id}`}
                  className="block rounded-lg border border-black/10 dark:border-white/10 p-4 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                >
                  <span className="font-medium">{c.name}</span>
                  {c.term && (
                    <span className="opacity-60 ml-2 text-sm">{c.term}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="opacity-60">No classes yet — add one below.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Add a class</h2>
        <form action={createClass} className="flex flex-col gap-3 max-w-sm">
          <input
            name="name"
            placeholder="Class name"
            required
            className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <input
            name="term"
            placeholder="Term (optional)"
            className="rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground text-background py-2 text-sm font-medium"
          >
            Create
          </button>
        </form>
      </section>
    </div>
  );
}
