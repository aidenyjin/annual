import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { TestPlayer } from "./TestPlayer";
import { PreparingTest } from "./PreparingTest";
import { isQuestion, type LessonStep, type QuestionStep } from "@/lib/lessons";

// Generating any not-yet-opened lessons before the test runs from this route.
export const maxDuration = 60;

export default async function TopicTestPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string }>;
}) {
  const { id, topicId } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("study_plan_topics")
    .select("id, heading, study_plans!inner(class_id)")
    .eq("id", topicId)
    .eq("study_plans.class_id", id)
    .single<{ id: string; heading: string }>();
  if (!topic) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("steps")
    .eq("topic_id", topicId)
    .order("order_index");

  const backHref = `/dashboard/classes/${id}/topics/${topicId}`;

  if (!lessons || lessons.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-10">
        <Link href={backHref} className="text-sm text-muted hover:text-accent">
          ← {topic.heading}
        </Link>
        <Card className="p-6 text-sm text-muted">
          There are no lessons to test yet. Generate this topic&apos;s lessons first.
        </Card>
      </div>
    );
  }

  // Any lesson not opened yet has no content — generate them all before the
  // test so its questions aren't limited to the lessons you happened to open.
  const anyUngenerated = lessons.some((l) => {
    const steps = l.steps as unknown[] | null;
    return !steps || steps.length === 0;
  });
  if (anyUngenerated) {
    return <PreparingTest classId={id} topicId={topicId} />;
  }

  // Pool every question across the topic's lessons.
  const questions: QuestionStep[] = [];
  for (const l of lessons) {
    const steps = (l.steps as LessonStep[] | null) ?? [];
    for (const step of steps) if (isQuestion(step)) questions.push(step);
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-10">
        <Link href={backHref} className="text-sm text-muted hover:text-accent">
          ← {topic.heading}
        </Link>
        <Card className="p-6 text-sm text-muted">
          These lessons don&apos;t have any questions to test.
        </Card>
      </div>
    );
  }

  return (
    <TestPlayer
      classId={id}
      topicId={topicId}
      heading={topic.heading}
      questions={questions}
      backHref={backHref}
    />
  );
}
