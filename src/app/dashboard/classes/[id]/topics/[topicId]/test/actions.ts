"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
