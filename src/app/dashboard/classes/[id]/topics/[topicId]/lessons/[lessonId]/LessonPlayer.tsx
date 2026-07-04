"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { QuestionView } from "@/components/lesson/QuestionViews";
import { markLessonComplete } from "../../lessons-actions";
import type { LessonStep } from "@/lib/lessons";

export function LessonPlayer({
  classId,
  topicId,
  lessonId,
  title,
  steps,
  backHref,
  nextHref,
}: {
  classId: string;
  topicId: string;
  lessonId: string;
  title: string;
  steps: LessonStep[];
  backHref: string;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [questionsSeen, setQuestionsSeen] = useState(0);
  const [done, setDone] = useState(false);

  const step = steps[index];
  const total = steps.length;
  const progress = done ? 100 : Math.round((index / total) * 100);

  async function advance() {
    if (index + 1 >= total) {
      setDone(true);
      try {
        await markLessonComplete(classId, topicId, lessonId);
      } catch {
        // Completion is best-effort; don't block the celebration screen.
      }
    } else {
      setIndex(index + 1);
      setAnswered(false);
    }
  }

  function onAnswered(correct: boolean) {
    setAnswered(true);
    setQuestionsSeen((n) => n + 1);
    if (correct) setCorrectCount((n) => n + 1);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col p-6 sm:p-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Exit lesson"
          className="text-xl text-muted hover:text-foreground"
        >
          ✕
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        {done ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-5xl">🎉</div>
            <h1 className="font-serif text-2xl text-foreground">Lesson complete</h1>
            <p className="text-muted">
              {questionsSeen > 0
                ? `You got ${correctCount} of ${questionsSeen} checks right.`
                : "Nicely done."}
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => router.push(backHref)}>
                Back to topic
              </Button>
              {nextHref && <Button onClick={() => router.push(nextHref)}>Next lesson</Button>}
            </div>
          </div>
        ) : step.kind === "teach" ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
            <h2 className="font-serif text-2xl text-foreground">{step.title}</h2>
            {step.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-wrap leading-relaxed text-foreground">
                {para}
              </p>
            ))}
          </div>
        ) : (
          <QuestionView key={index} step={step} onAnswered={onAnswered} />
        )}
      </div>

      {!done && (
        <div className="border-t border-border pt-5">
          <Button
            className="w-full"
            disabled={step.kind !== "teach" && !answered}
            onClick={advance}
          >
            {index + 1 >= total ? "Finish" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
