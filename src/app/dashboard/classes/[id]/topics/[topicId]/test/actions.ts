"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateLessonSteps } from "@/lib/lessons";

/**
 * A topic test pools questions from every lesson, but lessons generate their
 * content lazily on open — so before a test we generate any lesson that
 * hasn't been opened yet, otherwise the test would only include questions
 * from lessons the student happened to visit.
 */
export async function ensureTopicLessonsGenerated(classId: string, topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: topic } = await supabase
    .from("study_plan_topics")
    .select("heading, study_plans!inner(class_id)")
    .eq("id", topicId)
    .eq("study_plans.class_id", classId)
    .single<{ heading: string }>();
  if (!topic) throw new Error("Topic not found");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, outline, steps")
    .eq("topic_id", topicId)
    .order("order_index");

  for (const lesson of lessons ?? []) {
    const steps = lesson.steps as unknown[] | null;
    if (steps && steps.length > 0) continue;
    const generated = await generateLessonSteps(
      topic.heading,
      lesson.title,
      (lesson.outline as string[] | null) ?? []
    );
    await supabase.from("lessons").update({ steps: generated }).eq("id", lesson.id);
  }

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}/test`);
}

export async function markTopicTestPassed(classId: string, topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // RLS ensures the user owns this topic via the class chain.
  const { error } = await supabase
    .from("study_plan_topics")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", topicId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}`);
  revalidatePath(`/dashboard/classes/${classId}`);
}
