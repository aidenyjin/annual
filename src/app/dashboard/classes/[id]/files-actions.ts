"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateStudyPlan } from "@/lib/study-plan";

/**
 * Called after the browser has already uploaded the PDF straight to Supabase
 * Storage. The file never passes through this server action (which would hit
 * Vercel's 4.5MB request-body limit) — we only get the storage path, record
 * it, and rebuild the plan.
 */
export async function registerFile(
  classId: string,
  storagePath: string,
  originalFilename: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Guard: the path must live under this user's folder (matches storage RLS).
  if (!storagePath.startsWith(`${user.id}/${classId}/`)) {
    throw new Error("Invalid storage path");
  }

  const { error: insertError } = await supabase.from("syllabi").insert({
    class_id: classId,
    storage_path: storagePath,
    original_filename: originalFilename,
  });
  if (insertError) throw new Error(insertError.message);

  await regenerateStudyPlan(supabase, classId);

  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/settings`);
}

export async function deleteFile(classId: string, syllabusId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: syllabus, error } = await supabase
    .from("syllabi")
    .select("storage_path")
    .eq("id", syllabusId)
    .single();
  if (error || !syllabus) throw new Error(error?.message ?? "File not found");

  await supabase.storage.from("syllabi").remove([syllabus.storage_path]);

  const { error: deleteError } = await supabase
    .from("syllabi")
    .delete()
    .eq("id", syllabusId);
  if (deleteError) throw new Error(deleteError.message);

  // Deliberately doesn't regenerate the plan — that's another Gemini call,
  // which would make every delete slow. Use "Regenerate study plan" to refresh.
  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/settings`);
}
