import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

type Topic = {
  id: string;
  heading: string;
  week_label: string | null;
  due_date: string | null;
  source_excerpt: string | null;
  parent_id: string | null;
};

type Lesson = {
  id: string;
  order_index: number;
  title: string;
  content: string | null;
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id, topicId } = await params;
  const supabase = await createClient();

  const [{ data: topic }, { data: subtopics }, { data: lessons }] = await Promise.all([
    supabase
      .from("study_plan_topics")
      .select(
        "id, heading, week_label, due_date, source_excerpt, parent_id, study_plans!inner(class_id)"
      )
      .eq("id", topicId)
      .eq("study_plans.class_id", id)
      .single<Topic & { study_plans: { class_id: string } }>(),
    supabase
      .from("study_plan_topics")
      .select("id, heading, week_label, due_date")
      .eq("parent_id", topicId)
      .order("order_index"),
    supabase
      .from("lessons")
      .select("id, order_index, title, content")
      .eq("topic_id", topicId)
      .order("order_index"),
  ]);
  if (!topic) notFound();

  const { data: parent } = await (topic.parent_id
    ? supabase
        .from("study_plan_topics")
        .select("id, heading")
        .eq("id", topic.parent_id)
        .single()
    : Promise.resolve({ data: null }));

  const isUnit = (subtopics?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link
          href={
            parent
              ? `/dashboard/classes/${id}/topics/${parent.id}`
              : `/dashboard/classes/${id}`
          }
          className="text-sm text-muted hover:text-accent"
        >
          ← {parent ? parent.heading : "Study plan"}
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-foreground">{topic.heading}</h1>
        <div className="mt-1 flex gap-3 text-sm text-muted">
          {topic.week_label && <span>{topic.week_label}</span>}
          {topic.due_date && <span className="text-accent">Due {topic.due_date}</span>}
        </div>
        {topic.source_excerpt && (
          <p className="mt-3 text-sm text-muted">{topic.source_excerpt}</p>
        )}
      </div>

      {isUnit ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">Lessons in this unit</h2>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted opacity-60"
            >
              Unit test (coming soon)
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {subtopics!.map((s) => (
              <Link key={s.id} href={`/dashboard/classes/${id}/topics/${s.id}`}>
                <Card className="flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(30,25,15,0.06),0_16px_32px_-12px_rgba(30,25,15,0.24)]">
                  <span className="font-medium text-foreground">{s.heading}</span>
                  {s.week_label && (
                    <span className="shrink-0 text-xs text-muted">{s.week_label}</span>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">Lessons</h2>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted opacity-60"
            >
              Lesson test (coming soon)
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {(lessons as Lesson[] | null)?.map((lesson) => (
              <Card key={lesson.id} className="flex flex-col gap-2 p-5">
                <span className="font-medium text-foreground">{lesson.title}</span>
                <p className="text-sm text-muted">
                  {lesson.content ?? "Lesson content isn't generated yet."}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
