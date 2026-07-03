"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { registerFile } from "./files-actions";

type Phase = "idle" | "uploading" | "processing" | "error";

export function FileUpload({ classId }: { classId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function reset() {
    setPhase("idle");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setPhase("uploading");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You're not signed in.");

      // Upload straight to Storage from the browser — this skips the Vercel
      // function entirely, so large files aren't capped by the 4.5MB
      // serverless request-body limit.
      const path = `${user.id}/${classId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("syllabi")
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);

      // Extract the PDF text here in the browser rather than on the server —
      // pdf.js is CPU-heavy and was eating the serverless function's time
      // budget. The server just gets the resulting text.
      let extractedText = "";
      try {
        // Lazy-loaded so pdf.js isn't in the initial page bundle.
        const { extractPdfText } = await import("@/lib/pdf");
        const bytes = new Uint8Array(await file.arrayBuffer());
        extractedText = await extractPdfText(bytes);
      } catch {
        // Scanned/odd PDFs may fail extraction here; the server falls back
        // to reading the file directly from storage.
        extractedText = "";
      }

      // Now hand the server just the path + extracted text (no file bytes).
      setPhase("processing");
      await registerFile(classId, path, file.name, extractedText);

      reset();
      router.refresh();
    } catch (err) {
      setErrorMessage((err as Error).message);
      setPhase("error");
    }
  }

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
          className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground/5 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!file || busy}
          loading={phase === "uploading"}
          loadingText="Uploading…"
          onClick={handleUpload}
        >
          Upload
        </Button>
      </div>

      {phase === "processing" && (
        <Modal>
          <p className="font-serif text-lg text-foreground">
            Reading your file and updating the study plan…
          </p>
          <p className="mt-2 text-sm text-muted">
            This can take a moment for longer documents.
          </p>
        </Modal>
      )}

      {phase === "error" && (
        <Modal onClose={reset}>
          <p className="font-serif text-lg text-foreground">Upload failed</p>
          <p className="mt-2 text-sm text-muted">{errorMessage}</p>
          <div className="mt-5 flex justify-end">
            <Button variant="ghost" onClick={reset}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
