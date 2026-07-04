"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureLessonGenerated } from "../../lessons-actions";

export function PreparingLesson({
  classId,
  topicId,
  lessonId,
}: {
  classId: string;
  topicId: string;
  lessonId: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await ensureLessonGenerated(classId, topicId, lessonId);
        router.refresh();
      } catch {
        setFailed(true);
      }
    })();
  }, [classId, topicId, lessonId, router]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      {failed ? (
        <>
          <p className="font-serif text-2xl text-foreground">
            Couldn&apos;t prepare this lesson
          </p>
          <p className="text-sm text-muted">Please go back and try again.</p>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/classes/${classId}/topics/${topicId}`)}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
          >
            Back to topic
          </button>
        </>
      ) : (
        <>
          <svg className="h-10 w-10 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <div>
            <p className="font-serif text-2xl text-foreground">Preparing your questions…</p>
            <p className="mt-2 text-sm text-muted">
              Building this lesson for you — this only happens once.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
