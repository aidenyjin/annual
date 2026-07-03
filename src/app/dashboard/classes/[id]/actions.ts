"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSyllabusPdf, generateHeadings } from "@/lib/ai/gemini";

function toDateOrNull(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function uploadSyllabus(classId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file || file.type !== "application/pdf") {
    throw new Error("Please upload a PDF file");
  }

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

  revalidatePath(`/dashboard/classes/${classId}`);
}

export async function generatePlan(classId: string, syllabusId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: syllabus, error: syllabusError } = await supabase
    .from("syllabi")
    .select("storage_path, original_filename")
    .eq("id", syllabusId)
    .single();
  if (syllabusError || !syllabus) {
    throw new Error(syllabusError?.message ?? "Syllabus not found");
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("syllabi")
    .download(syllabus.storage_path);
  if (downloadError || !fileBlob) {
    throw new Error(downloadError?.message ?? "Could not download syllabus");
  }

  const pdfBytes = Buffer.from(await fileBlob.arrayBuffer());
  const parsed = await parseSyllabusPdf(pdfBytes, syllabus.original_filename);

  await supabase
    .from("syllabi")
    .update({ parsed_data: parsed, parsed_at: new Date().toISOString() })
    .eq("id", syllabusId);

  const { headings } = await generateHeadings(parsed);

  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .insert({ class_id: classId, syllabus_id: syllabusId })
    .select("id")
    .single();
  if (planError) throw new Error(planError.message);

  const topicRows = headings.map((h, i) => ({
    study_plan_id: plan.id,
    order_index: i,
    heading: h.heading,
    week_label: h.weekLabel ?? null,
    due_date: toDateOrNull(h.dueDate),
    source_excerpt: h.details ?? null,
  }));

  const { error: topicsError } = await supabase
    .from("study_plan_topics")
    .insert(topicRows);
  if (topicsError) throw new Error(topicsError.message);

  revalidatePath(`/dashboard/classes/${classId}`);
}
