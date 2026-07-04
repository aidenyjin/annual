import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonPlayer } from "./LessonPlayer";
import { PreparingLesson } from "./PreparingLesson";
import type { LessonStep } from "@/lib/lessons";

// Lazy lesson generation (Cerebras) runs from this route on first open.
export const maxDuration = 60;

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; topicId: string; lessonId: string }>;
}) {
  const { id, topicId, lessonId } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, order_index, title, steps, study_plan_topics!inner(study_plans!inner(class_id))"
    )
    .eq("id", lessonId)
    .eq("topic_id", topicId)
    .eq("study_plan_topics.study_plans.class_id", id)
    .single<{ id: string; order_index: number; title: string; steps: LessonStep[] | null }>();

  if (!lesson) notFound();

  // No content yet → generate it on the fly behind a full-screen loader.
  if (!lesson.steps || lesson.steps.length === 0) {
    return (
      <PreparingLesson classId={id} topicId={topicId} lessonId={lessonId} />
    );
  }

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
      classId={id}
      topicId={topicId}
      lessonId={lessonId}
      title={lesson.title}
      steps={lesson.steps}
      backHref={backHref}
      nextHref={nextHref}
    />
  );
}
