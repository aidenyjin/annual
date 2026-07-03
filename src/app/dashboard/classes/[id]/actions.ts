"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateStudyPlan } from "@/lib/study-plan";

export async function regeneratePlan(classId: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  await regenerateStudyPlan(supabase, classId);
  revalidatePath(`/dashboard/classes/${classId}`);
}
