import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CogIcon } from "@/components/ui/CogIcon";
import { regeneratePlan } from "./actions";
import { HoverTopic } from "./HoverTopic";

// Parsing/generating a study plan chains several AI calls together and can
// run past the platform's default serverless timeout on large syllabi.
export const maxDuration = 60;

type TopicRow = {
  id: string;
  order_index: number;
  heading: string;
  week_label: string | null;
  due_date: string | null;
  source_excerpt: string | null;
  parent_id: string | null;
};

export default async function ClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("id, name, term")
    .eq("id", id)
    .single();
  if (!klass) notFound();

  const { data: syllabi } = await supabase
    .from("syllabi")
    .select("id, original_filename, parsed_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const { data: plans } = await supabase
    .from("study_plans")
    .select(
      "id, study_plan_topics(id, order_index, heading, week_label, due_date, source_excerpt, parent_id)"
    )
    .eq("class_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const plan = plans?.[0] as
    | { id: string; study_plan_topics: TopicRow[] }
    | undefined;
  const allTopics = plan?.study_plan_topics ?? [];
  const topics = allTopics
    .filter((t) => !t.parent_id)
    .sort((a, b) => a.order_index - b.order_index)
    .map((t) => ({
      ...t,
      subtopics: allTopics
        .filter((s) => s.parent_id === t.id)
        .sort((a, b) => a.order_index - b.order_index),
    }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-muted hover:text-accent">
            ← All classes
          </Link>
          <h1 className="mt-2 font-serif text-3xl text-foreground">{klass.name}</h1>
          {klass.term && <p className="mt-1 text-muted">{klass.term}</p>}
        </div>
        <Link
          href={`/dashboard/classes/${id}/settings`}
          aria-label="Class settings"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/80 text-muted backdrop-blur-xl transition-colors hover:text-accent"
        >
          <CogIcon />
        </Link>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Files</h2>
          <Link
            href={`/dashboard/classes/${id}/settings`}
            className="text-sm text-accent hover:underline"
          >
            Manage files
          </Link>
        </div>
        {syllabi && syllabi.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {syllabi.map((s) => (
              <li key={s.id}>
                {s.original_filename}
                {s.parsed_at ? " — parsed" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No files yet — add one from Manage files.
          </p>
        )}
      </Card>

      {syllabi && syllabi.length > 0 && (
        <form action={regeneratePlan.bind(null, id)}>
          <SubmitButton pendingText="Generating study plan…">
            {topics.length > 0 ? "Regenerate study plan" : "Generate study plan"}
          </SubmitButton>
        </form>
      )}

      {topics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg text-foreground">Study plan</h2>
          <div className="flex flex-col gap-4">
            {topics.map((t) => (
              <div key={t.id} className="flex flex-col gap-3">
                <HoverTopic
                  heading={t.heading}
                  weekLabel={t.week_label}
                  dueDate={t.due_date}
                  sourceExcerpt={t.source_excerpt}
                />
                {t.subtopics.length > 0 && (
                  <div className="ml-4 flex flex-col gap-3 border-l border-border pl-4 sm:ml-6 sm:pl-6">
                    {t.subtopics.map((s) => (
                      <HoverTopic
                        key={s.id}
                        heading={s.heading}
                        weekLabel={s.week_label}
                        dueDate={s.due_date}
                        sourceExcerpt={s.source_excerpt}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
