import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { generateLessons } from "./lessons-actions";

type Topic = {
  id: string;
  heading: string;
  week_label: string | null;
  due_date: string | null;
  source_excerpt: string | null;
  parent_id: string | null;
  study_plan_id: string;
};

type Lesson = {
  id: string;
  order_index: number;
  title: string;
  outline: string[] | null;
  steps: unknown[] | null;
};

type NavTopic = { id: string; heading: string; order_index: number; parent_id: string | null };

// Flatten the plan into the order a student reads it: walk each top-level
// topic, descending into its subtopics; a topic with no subtopics is itself
// a leaf. Units (parents with subtopics) are containers, not stops.
function flattenLeaves(all: NavTopic[]): NavTopic[] {
  const byOrder = (a: NavTopic, b: NavTopic) => a.order_index - b.order_index;
  const topLevel = all.filter((t) => !t.parent_id).sort(byOrder);
  const leaves: NavTopic[] = [];
  for (const t of topLevel) {
    const subs = all.filter((s) => s.parent_id === t.id).sort(byOrder);
    if (subs.length > 0) leaves.push(...subs);
    else leaves.push(t);
  }
  return leaves;
}

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
        "id, heading, week_label, due_date, source_excerpt, parent_id, study_plan_id, study_plans!inner(class_id)"
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
      .select("id, order_index, title, outline, steps")
      .eq("topic_id", topicId)
      .order("order_index"),
  ]);
  if (!topic) notFound();

  const [{ data: parent }, { data: allTopics }] = await Promise.all([
    topic.parent_id
      ? supabase
          .from("study_plan_topics")
          .select("id, heading")
          .eq("id", topic.parent_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("study_plan_topics")
      .select("id, heading, order_index, parent_id")
      .eq("study_plan_id", topic.study_plan_id),
  ]);

  const isUnit = (subtopics?.length ?? 0) > 0;
  const lessonRows = (lessons ?? []) as Lesson[];
  const hasLessons = lessonRows.some((l) => l.steps && l.steps.length > 0);

  // Prev/next across the flattened leaf sequence (only meaningful on leaves).
  const leaves = flattenLeaves((allTopics ?? []) as NavTopic[]);
  const idx = leaves.findIndex((l) => l.id === topicId);
  const prev = idx > 0 ? leaves[idx - 1] : null;
  const next = idx >= 0 && idx < leaves.length - 1 ? leaves[idx + 1] : null;

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
          <h2 className="font-serif text-lg text-foreground">Lessons in this unit</h2>
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
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-foreground">Lessons</h2>
            <form action={generateLessons.bind(null, id, topicId)}>
              <SubmitButton
                variant={hasLessons ? "secondary" : "primary"}
                pendingText="Generating…"
              >
                {hasLessons ? "Regenerate lessons" : "Generate lessons"}
              </SubmitButton>
            </form>
          </div>

          {hasLessons ? (
            <div className="flex flex-col gap-4">
              {lessonRows.map((lesson, i) => (
                <Link
                  key={lesson.id}
                  href={`/dashboard/classes/${id}/topics/${topicId}/lessons/${lesson.id}`}
                >
                  <Card className="flex flex-col gap-3 p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(30,25,15,0.06),0_16px_32px_-12px_rgba(30,25,15,0.24)]">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-serif text-lg text-foreground">
                        {i + 1}. {lesson.title}
                      </h3>
                      <span className="shrink-0 text-sm text-accent">Start →</span>
                    </div>
                    {lesson.outline && lesson.outline.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {lesson.outline.map((point, j) => (
                          <li key={j} className="flex gap-2 text-sm text-muted">
                            <span className="text-accent">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-5 text-sm text-muted">
              No lessons yet. Click <span className="text-foreground">Generate lessons</span>{" "}
              to create them for this topic.
            </Card>
          )}
        </section>
      )}

      {(prev || next) && (
        <nav className="flex items-center justify-between gap-3 border-t border-border pt-5">
          {prev ? (
            <Link
              href={`/dashboard/classes/${id}/topics/${prev.id}`}
              className="flex flex-col items-start rounded-xl border border-border px-4 py-2.5 transition-colors hover:border-accent/50"
            >
              <span className="text-xs text-muted">← Previous</span>
              <span className="text-sm text-foreground">{prev.heading}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/dashboard/classes/${id}/topics/${next.id}`}
              className="flex flex-col items-end rounded-xl border border-border px-4 py-2.5 text-right transition-colors hover:border-accent/50"
            >
              <span className="text-xs text-muted">Next →</span>
              <span className="text-sm text-foreground">{next.heading}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
