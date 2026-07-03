import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FileUploadWithCheck } from "../FileUploadWithCheck";
import { FilesList } from "./FilesList";
import { DeleteClassButton } from "./DeleteClassButton";
import { updateClass } from "./actions";

// checkFile/commitFile chain Gemini file upload + processing + generation,
// which can run past the platform's default serverless timeout on large PDFs.
export const maxDuration = 60;

export default async function ClassSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("id, name, term")
    .eq("id", id)
    .single();
  if (!klass) notFound();

  const { data: syllabi } = await supabase
    .from("syllabi")
    .select("id, original_filename, parsed_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6 sm:p-10">
      <div>
        <Link
          href={`/dashboard/classes/${id}`}
          className="text-sm text-muted hover:text-accent"
        >
          ← {klass.name}
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-foreground">Settings</h1>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-serif text-lg text-foreground">Class details</h2>
        <form
          action={updateClass.bind(null, id)}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Name
            <Input name="name" defaultValue={klass.name} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Term
            <Input name="term" defaultValue={klass.term ?? ""} />
          </label>
          <SubmitButton pendingText="Saving…" className="self-start">
            Save changes
          </SubmitButton>
        </form>

        <div className="mt-2 border-t border-border pt-4">
          <DeleteClassButton classId={id} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-serif text-lg text-foreground">Files</h2>
        <FilesList classId={id} files={syllabi ?? []} />
        <div className="border-t border-border pt-4">
          <FileUploadWithCheck classId={id} />
        </div>
      </Card>
    </div>
  );
}
