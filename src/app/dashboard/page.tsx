import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CogIcon } from "@/components/ui/CogIcon";
import { createClass } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, term, syllabi(id), study_plans(id)")
    .eq("user_id", session!.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-6 sm:p-10">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Your classes</h1>
        <p className="mt-1 text-sm text-muted">
          Upload a syllabus, get a study plan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes?.map((c) => {
          const hasSyllabus = (c.syllabi?.length ?? 0) > 0;
          const hasPlan = (c.study_plans?.length ?? 0) > 0;
          return (
            <Card
              key={c.id}
              className="relative flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(30,25,15,0.06),0_16px_32px_-12px_rgba(30,25,15,0.24)]"
            >
              <Link
                href={`/dashboard/classes/${c.id}/settings`}
                aria-label="Class settings"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-accent"
              >
                <CogIcon />
              </Link>
              <Link
                href={`/dashboard/classes/${c.id}`}
                className="flex flex-1 flex-col gap-3 pr-8"
              >
                <span className="font-serif text-lg text-foreground">
                  {c.name}
                </span>
                {c.term && <span className="text-sm text-muted">{c.term}</span>}
                <div className="mt-auto flex gap-2 pt-2 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      hasSyllabus
                        ? "bg-accent/10 text-accent"
                        : "bg-foreground/5 text-muted"
                    }`}
                  >
                    {hasSyllabus ? "Syllabus uploaded" : "No syllabus yet"}
                  </span>
                  {hasPlan && (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                      Plan ready
                    </span>
                  )}
                </div>
              </Link>
            </Card>
          );
        })}

        <Card className="flex flex-col gap-3 p-5">
          <span className="font-serif text-lg text-foreground">
            Add a class
          </span>
          <form action={createClass} className="flex flex-col gap-3">
            <Input name="name" placeholder="Class name" required />
            <Input name="term" placeholder="Term (optional)" />
            <SubmitButton pendingText="Creating…" className="w-full">
              Create class
            </SubmitButton>
          </form>
        </Card>
      </div>

      {(!classes || classes.length === 0) && (
        <p className="text-sm text-muted">
          No classes yet — add your first one above.
        </p>
      )}
    </div>
  );
}
