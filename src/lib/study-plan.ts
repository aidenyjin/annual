import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseSyllabusPdf,
  parseSyllabusFromFile,
  generateHeadings,
  type ParsedSyllabus,
} from "@/lib/ai/gemini";
import { extractPdfText } from "@/lib/pdf";

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
    .select("id, storage_path, original_filename, parsed_data, extracted_text")
    .eq("class_id", classId);
  if (error) throw new Error(error.message);

  const combinedTopics: ParsedSyllabus["topics"] = [];

  for (const syllabus of syllabi ?? []) {
    let parsed = syllabus.parsed_data as ParsedSyllabus | null;

    if (!parsed) {
      const cachedText = (syllabus.extracted_text as string | null)?.trim() ?? "";

      if (cachedText.length >= 40) {
        // Text was already extracted in the browser at upload time — no
        // server-side PDF work, just the Gemini parse.
        parsed = await parseSyllabusPdf(cachedText);
      } else {
        // No usable cached text (an older upload, or a scanned/image-only
        // PDF). Download and try locally; if there's still no text layer,
        // let Gemini read the file directly.
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from("syllabi")
          .download(syllabus.storage_path);
        if (downloadError || !fileBlob) {
          throw new Error(
            downloadError?.message ?? `Could not download ${syllabus.original_filename}`
          );
        }

        const bytes = Buffer.from(await fileBlob.arrayBuffer());
        const text = await extractPdfText(bytes);
        parsed =
          text.length < 40
            ? await parseSyllabusFromFile(bytes, syllabus.original_filename)
            : await parseSyllabusPdf(text);
      }

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

  // Leaf topics (no subtopics) get their lesson placeholder now; topics
  // with subtopics don't — the subtopics themselves are the leaves.
  const leafTopicIds: string[] = [];
  const leafTopicTitles = new Map<string, string>();

  const childRows = headings.flatMap((h, i) => {
    const parentRow = insertedTopLevel!.find((r) => r.order_index === i);
    if (!parentRow) return [];

    if (!h.subtopics || h.subtopics.length === 0) {
      leafTopicIds.push(parentRow.id);
      leafTopicTitles.set(parentRow.id, h.heading);
      return [];
    }

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
    const { data: insertedChildren, error: childError } = await supabase
      .from("study_plan_topics")
      .insert(childRows)
      .select("id, heading");
    if (childError) throw new Error(childError.message);

    for (const child of insertedChildren ?? []) {
      leafTopicIds.push(child.id);
      leafTopicTitles.set(child.id, child.heading);
    }
  }

  if (leafTopicIds.length > 0) {
    const lessonRows = leafTopicIds.map((topicId) => ({
      topic_id: topicId,
      order_index: 0,
      title: leafTopicTitles.get(topicId)!,
    }));

    const { error: lessonError } = await supabase.from("lessons").insert(lessonRows);
    if (lessonError) throw new Error(lessonError.message);
  }
}
