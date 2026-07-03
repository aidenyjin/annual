"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { deleteFile } from "../files-actions";

type File = {
  id: string;
  original_filename: string;
  parsed_at: string | null;
};

export function FilesList({ classId, files }: { classId: string; files: File[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    startTransition(async () => {
      await deleteFile(classId, id);
      setConfirmId(null);
      router.refresh();
    });
  }

  if (files.length === 0) {
    return <p className="text-sm text-muted">No files uploaded yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm"
        >
          <span className="text-foreground">
            {f.original_filename}
            {!f.parsed_at && <span className="ml-2 text-xs text-muted">not parsed yet</span>}
          </span>
          <Button
            type="button"
            variant={confirmId === f.id ? "danger" : "ghost"}
            loading={pending && confirmId === f.id}
            loadingText="Deleting…"
            className="px-3 py-1 text-xs"
            onClick={() => handleDelete(f.id)}
          >
            {confirmId === f.id ? "Confirm delete" : "Delete"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
