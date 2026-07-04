"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planLessonsForTopic, type LessonPlan } from "@/lib/ai/groq";
import { generateLessonSteps } from "@/lib/lessons";

async function loadOwnedTopic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  topicId: string
) {
  const { data, error } = await supabase
    .from("study_plan_topics")
    .select("id, heading, source_excerpt, study_plans!inner(class_id)")
    .eq("id", topicId)
    .eq("study_plans.class_id", classId)
    .single<{ id: string; heading: string; source_excerpt: string | null }>();
  if (error || !data) throw new Error(error?.message ?? "Topic not found");
  return data;
}

// Step 1 (Groq): plan the lessons — creates lesson rows with titles + outlines
// but no content yet. Content is generated lazily on first open.
export async function generateLessons(classId: string, topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const topic = await loadOwnedTopic(supabase, classId, topicId);

  let plans: LessonPlan[] = [];
  try {
    plans = await planLessonsForTopic(topic.heading, topic.source_excerpt);
  } catch (err) {
    console.error("Groq lesson planning failed; using a single fallback lesson", err);
  }
  if (plans.length === 0) {
    plans = [{ title: topic.heading, outline: ["Overview", "Key ideas", "Practice"] }];
  }

  await supabase.from("lessons").delete().eq("topic_id", topicId);

  const rows = plans.map((plan, i) => ({
    topic_id: topicId,
    order_index: i,
    title: plan.title,
    outline: plan.outline,
    steps: null,
  }));

  const { error } = await supabase.from("lessons").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}`);
}

// Step 2 (Cerebras): generate the stepped content for one lesson, on demand.
// No-op if the lesson already has steps.
export async function ensureLessonGenerated(
  classId: string,
  topicId: string,
  lessonId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const topic = await loadOwnedTopic(supabase, classId, topicId);

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, title, outline, steps")
    .eq("id", lessonId)
    .eq("topic_id", topicId)
    .single<{ id: string; title: string; outline: string[] | null; steps: unknown[] | null }>();
  if (error || !lesson) throw new Error(error?.message ?? "Lesson not found");

  if (lesson.steps && lesson.steps.length > 0) return;

  const steps = await generateLessonSteps(
    topic.heading,
    lesson.title,
    lesson.outline ?? []
  );

  const { error: updateError } = await supabase
    .from("lessons")
    .update({ steps })
    .eq("id", lessonId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}/lessons/${lessonId}`);
}

export async function markLessonComplete(
  classId: string,
  topicId: string,
  lessonId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("lessons")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", lessonId)
    .eq("topic_id", topicId);

  // If every lesson in the topic is now complete, mark the topic complete too.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("completed_at")
    .eq("topic_id", topicId);

  const allDone =
    (lessons?.length ?? 0) > 0 && lessons!.every((l) => l.completed_at);
  if (allDone) {
    await supabase
      .from("study_plan_topics")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", topicId);
  }

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}`);
  revalidatePath(`/dashboard/classes/${classId}`);
}
