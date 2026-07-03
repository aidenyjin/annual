import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadSyllabus, generatePlan } from "./actions";
import { HoverTopic } from "./HoverTopic";

type TopicRow = {
  id: string;
  order_index: number;
  heading: string;
  week_label: string | null;
  due_date: string | null;
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
    .select("id, study_plan_topics(id, order_index, heading, week_label, due_date)")
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
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{klass.name}</h1>
        {klass.term && <p className="opacity-60">{klass.term}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Syllabus</h2>
        <form
          action={uploadSyllabus.bind(null, id)}
          className="flex items-center gap-3"
        >
          <input
            type="file"
            name="file"
            accept="application/pdf"
            required
            className="text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm"
          >
            Upload
          </button>
        </form>
        {syllabi && syllabi.length > 0 && (
          <ul className="text-sm opacity-70 flex flex-col gap-1">
            {syllabi.map((s) => (
              <li key={s.id}>
                {s.original_filename}
                {s.parsed_at ? " — parsed" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {latestSyllabus && (
        <section className="flex flex-col gap-3">
          <form action={generatePlan.bind(null, id, latestSyllabus.id)}>
            <button
              type="submit"
              className="rounded-md border border-black/20 dark:border-white/20 px-3 py-1.5 text-sm"
            >
              Generate study plan
            </button>
          </form>
        </section>
      )}

      {topics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Study plan</h2>
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <HoverTopic
                key={t.id}
                heading={t.heading}
                weekLabel={t.week_label}
                dueDate={t.due_date}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
