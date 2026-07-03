"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { checkFile, commitFile } from "./files-actions";

type Phase =
  | "idle"
  | "checking"
  | "auto-committing"
  | "ambiguous"
  | "unrelated"
  | "unrelated-warning"
  | "committing"
  | "error";

export function FileUploadWithCheck({ classId }: { classId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function reset() {
    setPhase("idle");
    setFile(null);
    setReason("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleAdd() {
    if (!file) return;
    setPhase("checking");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await checkFile(classId, formData);

      if (result.verdict === "related") {
        setPhase("auto-committing");
        await doCommit(file);
      } else if (result.verdict === "ambiguous") {
        setReason(result.reason);
        setPhase("ambiguous");
      } else {
        setReason(result.reason);
        setPhase("unrelated");
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
      setPhase("error");
    }
  }

  async function doCommit(f: File) {
    setPhase("committing");
    try {
      const formData = new FormData();
      formData.append("file", f);
      await commitFile(classId, formData);
      reset();
      router.refresh();
    } catch (err) {
      setErrorMessage((err as Error).message);
      setPhase("error");
    }
  }

  const busy = phase === "checking" || phase === "auto-committing" || phase === "committing";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground/5 file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!file || busy}
          loading={phase === "checking"}
          loadingText="Checking…"
          onClick={handleAdd}
        >
          Add file
        </Button>
      </div>

      {(phase === "auto-committing" || phase === "committing") && (
        <Modal>
          <p className="font-serif text-lg text-foreground">
            {phase === "auto-committing"
              ? "Updating your course with the new material…"
              : "Adding your file…"}
          </p>
          <p className="mt-2 text-sm text-muted">This won&apos;t take long.</p>
        </Modal>
      )}

      {phase === "ambiguous" && (
        <Modal onClose={reset}>
          <p className="font-serif text-lg text-foreground">Are you sure?</p>
          <p className="mt-2 text-sm text-muted">
            This file might not be related to this class. {reason}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={() => file && doCommit(file)}>Upload anyway</Button>
          </div>
        </Modal>
      )}

      {phase === "unrelated" && (
        <Modal onClose={reset}>
          <p className="font-serif text-lg text-foreground">
            This file doesn&apos;t look like it belongs here
          </p>
          <p className="mt-2 text-sm text-muted">{reason}</p>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPhase("unrelated-warning")}
              className="text-xs text-muted underline hover:text-accent"
            >
              Override
            </button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {phase === "unrelated-warning" && (
        <Modal onClose={reset}>
          <p className="font-serif text-lg text-foreground">Heads up</p>
          <p className="mt-2 text-sm text-muted">
            Uploading a file that doesn&apos;t match this class can produce
            strange results in your study plan. Continue anyway?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => file && doCommit(file)}>
              Continue anyway
            </Button>
          </div>
        </Modal>
      )}

      {phase === "error" && (
        <Modal onClose={reset}>
          <p className="font-serif text-lg text-foreground">Something went wrong</p>
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
