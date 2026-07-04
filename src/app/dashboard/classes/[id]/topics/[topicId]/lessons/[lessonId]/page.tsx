import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonPlayer } from "./LessonPlayer";

type LessonStep =
  | { kind: "teach"; title: string; body: string }
  | {
      kind: "question";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string; lessonId: string }>;
}) {
  const { id, topicId, lessonId } = await params;
  const supabase = await createClient();

  // Load the lesson, verifying ownership through the topic → plan → class chain.
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, order_index, title, steps, study_plan_topics!inner(study_plans!inner(class_id))"
    )
    .eq("id", lessonId)
    .eq("topic_id", topicId)
    .eq("study_plan_topics.study_plans.class_id", id)
    .single<{ id: string; order_index: number; title: string; steps: LessonStep[] | null }>();

  if (!lesson || !lesson.steps) notFound();

  // Find the next lesson in this topic (for the "Next lesson" button).
  const { data: siblings } = await supabase
    .from("lessons")
    .select("id, order_index")
    .eq("topic_id", topicId)
    .order("order_index");

  const nextSibling =
    siblings?.find((s) => s.order_index > lesson.order_index) ?? null;

  const backHref = `/dashboard/classes/${id}/topics/${topicId}`;
  const nextHref = nextSibling
    ? `/dashboard/classes/${id}/topics/${topicId}/lessons/${nextSibling.id}`
    : null;

  return (
    <LessonPlayer
      title={lesson.title}
      steps={lesson.steps}
      backHref={backHref}
      nextHref={nextHref}
    />
  );
}
