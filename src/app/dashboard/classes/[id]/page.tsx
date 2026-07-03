import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { uploadSyllabus, generatePlan } from "./actions";
import { HoverTopic } from "./HoverTopic";

type TopicRow = {
  id: string;
  order_index: number;
  heading: string;
  week_label: string | null;
  due_date: string | null;
  source_excerpt: string | null;
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

  const latestSyllabus = syllabi?.[0];

  const { data: plans } = await supabase
    .from("study_plans")
    .select(
      "id, study_plan_topics(id, order_index, heading, week_label, due_date, source_excerpt)"
    )
    .eq("class_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const plan = plans?.[0] as
    | { id: string; study_plan_topics: TopicRow[] }
    | undefined;
  const topics = [...(plan?.study_plan_topics ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-accent">
          ← All classes
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-foreground">{klass.name}</h1>
        {klass.term && <p className="mt-1 text-muted">{klass.term}</p>}
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-serif text-lg text-foreground">Syllabus</h2>
        <form
          action={uploadSyllabus.bind(null, id)}
          className="flex flex-col items-start gap-3 sm:flex-row sm:items-center"
        >
          <input
            type="file"
            name="file"
            accept="application/pdf"
            required
            className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground/5 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          />
          <SubmitButton pendingText="Uploading…" variant="secondary">
            Upload
          </SubmitButton>
        </form>
        {syllabi && syllabi.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {syllabi.map((s) => (
              <li key={s.id}>
                {s.original_filename}
                {s.parsed_at ? " — parsed" : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {latestSyllabus && (
        <form action={generatePlan.bind(null, id, latestSyllabus.id)}>
          <SubmitButton pendingText="Generating study plan…">
            Generate study plan
          </SubmitButton>
        </form>
      )}

      {topics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg text-foreground">Study plan</h2>
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <HoverTopic
                key={t.id}
                heading={t.heading}
                weekLabel={t.week_label}
                dueDate={t.due_date}
                sourceExcerpt={t.source_excerpt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
