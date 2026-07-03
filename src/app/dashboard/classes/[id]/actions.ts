"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateStudyPlan } from "@/lib/study-plan";

export async function regeneratePlan(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await regenerateStudyPlan(supabase, classId);
  revalidatePath(`/dashboard/classes/${classId}`);
}
