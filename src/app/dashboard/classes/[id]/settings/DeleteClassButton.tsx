"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteClass } from "./actions";

export function DeleteClassButton({ classId }: { classId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-red-600 hover:bg-red-600/10"
        onClick={() => setConfirming(true)}
      >
        Delete class
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">
        Delete this class and all its files? This can&apos;t be undone.
      </span>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
      <Button
        variant="danger"
        loading={pending}
        loadingText="Deleting…"
        onClick={() => startTransition(() => deleteClass(classId))}
      >
        Confirm delete
      </Button>
    </div>
  );
}
