import type { SupabaseClient } from "@supabase/supabase-js";
import { parseSyllabusPdf, generateHeadings, type ParsedSyllabus } from "@/lib/ai/gemini";

function toDateOrNull(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Rebuilds a class's study plan from every uploaded file, not just the most
 * recent one. Each file is parsed once (and cached on syllabi.parsed_data);
 * this only re-parses files that don't have that cached yet.
 */
export async function regenerateStudyPlan(supabase: SupabaseClient, classId: string) {
  const { data: syllabi, error } = await supabase
    .from("syllabi")
    .select("id, storage_path, original_filename, parsed_data")
    .eq("class_id", classId);
  if (error) throw new Error(error.message);

  const combinedTopics: ParsedSyllabus["topics"] = [];

  for (const syllabus of syllabi ?? []) {
    let parsed = syllabus.parsed_data as ParsedSyllabus | null;

    if (!parsed) {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("syllabi")
        .download(syllabus.storage_path);
      if (downloadError || !fileBlob) {
        throw new Error(
          downloadError?.message ?? `Could not download ${syllabus.original_filename}`
        );
      }

      const bytes = Buffer.from(await fileBlob.arrayBuffer());
      parsed = await parseSyllabusPdf(bytes, syllabus.original_filename);

      await supabase
        .from("syllabi")
        .update({ parsed_data: parsed, parsed_at: new Date().toISOString() })
        .eq("id", syllabus.id);
    }

    combinedTopics.push(...parsed.topics);
  }

  const { data: oldPlans } = await supabase
    .from("study_plans")
    .select("id")
    .eq("class_id", classId);
  if (oldPlans && oldPlans.length > 0) {
    await supabase
      .from("study_plans")
      .delete()
      .in(
        "id",
        oldPlans.map((p) => p.id)
      );
  }

  if (combinedTopics.length === 0) return;

  const { headings } = await generateHeadings({ topics: combinedTopics });

  const { data: plan, error: planError } = await supabase
    .from("study_plans")
    .insert({ class_id: classId })
    .select("id")
    .single();
  if (planError) throw new Error(planError.message);

  const topLevelRows = headings.map((h, i) => ({
    study_plan_id: plan.id,
    order_index: i,
    heading: h.heading,
    week_label: h.weekLabel ?? null,
    due_date: toDateOrNull(h.dueDate),
    source_excerpt: h.details ?? null,
  }));

  const { data: insertedTopLevel, error: topicsError } = await supabase
    .from("study_plan_topics")
    .insert(topLevelRows)
    .select("id, order_index");
  if (topicsError) throw new Error(topicsError.message);

  const childRows = headings.flatMap((h, i) => {
    if (!h.subtopics || h.subtopics.length === 0) return [];
    const parentRow = insertedTopLevel!.find((r) => r.order_index === i);
    if (!parentRow) return [];

    return h.subtopics.map((sub, j) => ({
      study_plan_id: plan.id,
      order_index: j,
      heading: sub.heading,
      week_label: sub.weekLabel ?? null,
      due_date: toDateOrNull(sub.dueDate),
      source_excerpt: sub.details ?? null,
      parent_id: parentRow.id,
    }));
  });

  if (childRows.length > 0) {
    const { error: childError } = await supabase
      .from("study_plan_topics")
      .insert(childRows);
    if (childError) throw new Error(childError.message);
  }
}
