"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { regenerateStudyPlan } from "@/lib/study-plan";
import { extractPdfText } from "@/lib/pdf";
import { type ParsedTopic } from "@/lib/ai/gemini";
import { quickSummarizeText, classifyFileRelevance, type RelevanceVerdict } from "@/lib/ai/groq";

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
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const file = readFile(formData);

  const [{ data: klass }, { data: existing }] = await Promise.all([
    supabase.from("classes").select("name, term").eq("id", classId).single(),
    supabase
      .from("syllabi")
      .select("parsed_data")
      .eq("class_id", classId)
      .not("parsed_data", "is", null),
  ]);
  if (!klass) throw new Error("Class not found");

  const existingTopics = (existing ?? []).flatMap(
    (s) => ((s.parsed_data as { topics?: ParsedTopic[] } | null)?.topics ?? [])
  );

  if (existingTopics.length === 0) {
    return { verdict: "related", reason: "First file added to this class." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(bytes);

  if (text.trim().length < 40) {
    return {
      verdict: "ambiguous",
      reason: "Couldn't read this file's content to check it automatically.",
    };
  }

  const quick = await quickSummarizeText(text);

  const context = `Class: ${klass.name}${klass.term ? ` (${klass.term})` : ""}\nExisting topics: ${existingTopics
    .slice(0, 40)
    .map((t) => t.title)
    .join(", ")}`;

  return classifyFileRelevance(context, quick);
}

export async function commitFile(classId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const file = readFile(formData);

  const path = `${session.user.id}/${classId}/${Date.now()}-${file.name}`;
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
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

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

  // Deliberately doesn't touch the existing study plan — regenerating means
  // another Gemini call, which would make every delete slow for no reason.
  // The user can hit "Regenerate study plan" if they want it updated.
  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/settings`);
}
