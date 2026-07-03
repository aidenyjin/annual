"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateStudyPlan } from "@/lib/study-plan";
import { quickSummarizeFile, type ParsedTopic } from "@/lib/ai/gemini";
import { classifyFileRelevance, type RelevanceVerdict } from "@/lib/ai/groq";

export type FileCheckResult = { verdict: RelevanceVerdict; reason: string };

function readFile(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please upload a PDF file");
  }
  return file;
}

export async function checkFile(
  classId: string,
  formData: FormData
): Promise<FileCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = readFile(formData);

  const { data: klass } = await supabase
    .from("classes")
    .select("name, term")
    .eq("id", classId)
    .single();
  if (!klass) throw new Error("Class not found");

  const { data: existing } = await supabase
    .from("syllabi")
    .select("parsed_data")
    .eq("class_id", classId)
    .not("parsed_data", "is", null);

  const existingTopics = (existing ?? []).flatMap(
    (s) => ((s.parsed_data as { topics?: ParsedTopic[] } | null)?.topics ?? [])
  );

  if (existingTopics.length === 0) {
    return { verdict: "related", reason: "First file added to this class." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const quick = await quickSummarizeFile(bytes, file.name);

  const context = `Class: ${klass.name}${klass.term ? ` (${klass.term})` : ""}\nExisting topics: ${existingTopics
    .slice(0, 40)
    .map((t) => t.title)
    .join(", ")}`;

  return classifyFileRelevance(context, quick);
}

export async function commitFile(classId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = readFile(formData);

  const path = `${user.id}/${classId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("syllabi")
    .upload(path, file, { contentType: "application/pdf" });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("syllabi").insert({
    class_id: classId,
    storage_path: path,
    original_filename: file.name,
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

  await regenerateStudyPlan(supabase, classId);

  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/settings`);
}
