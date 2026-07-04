"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateLessonsForTopic } from "@/lib/lessons";

export async function generateLessons(classId: string, topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify the topic belongs to a class this user owns (RLS also enforces it).
  const { data: topic, error: topicError } = await supabase
    .from("study_plan_topics")
    .select("id, heading, source_excerpt, study_plans!inner(class_id)")
    .eq("id", topicId)
    .eq("study_plans.class_id", classId)
    .single<{ id: string; heading: string; source_excerpt: string | null }>();
  if (topicError || !topic) throw new Error(topicError?.message ?? "Topic not found");

  const generated = generateLessonsForTopic(topic.heading, topic.source_excerpt);

  // Replace any existing lessons for this topic (regenerate case).
  await supabase.from("lessons").delete().eq("topic_id", topicId);

  const rows = generated.map((lesson, i) => ({
    topic_id: topicId,
    order_index: i,
    title: lesson.title,
    outline: lesson.outline,
    content: lesson.content,
    quiz: lesson.quiz,
  }));

  const { error: insertError } = await supabase.from("lessons").insert(rows);
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/dashboard/classes/${classId}/topics/${topicId}`);
}
