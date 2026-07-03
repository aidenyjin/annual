"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateClass(classId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const term = (formData.get("term") as string)?.trim();
  if (!name) throw new Error("Class name is required");

  const { error } = await supabase
    .from("classes")
    .update({ name, term: term || null })
    .eq("id", classId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/settings`);
  revalidatePath("/dashboard");
}

export async function deleteClass(classId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: syllabi } = await supabase
    .from("syllabi")
    .select("storage_path")
    .eq("class_id", classId);

  if (syllabi && syllabi.length > 0) {
    await supabase.storage
      .from("syllabi")
      .remove(syllabi.map((s) => s.storage_path));
  }

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
