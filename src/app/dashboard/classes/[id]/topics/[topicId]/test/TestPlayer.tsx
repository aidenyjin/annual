"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { QuestionView } from "@/components/lesson/QuestionViews";
import { markTopicTestPassed } from "./actions";
import type { QuestionStep } from "@/lib/lessons";

const PASS_RATIO = 0.7;

export function TestPlayer({
  classId,
  topicId,
  heading,
  questions,
  backHref,
}: {
  classId: string;
  topicId: string;
  heading: string;
  questions: QuestionStep[];
  backHref: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const total = questions.length;
  const step = questions[index];
  const progress = done ? 100 : Math.round((index / total) * 100);
  const passed = correct / total >= PASS_RATIO;

  async function advance() {
    if (index + 1 >= total) {
      setDone(true);
      if (correct / total >= PASS_RATIO) {
        try {
          await markTopicTestPassed(classId, topicId);
        } catch {
          // best-effort
        }
      }
    } else {
      setIndex(index + 1);
      setAnswered(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col p-6 sm:p-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Exit test"
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
            <div className="text-5xl">{passed ? "🏆" : "📚"}</div>
            <h1 className="font-serif text-2xl text-foreground">
              {passed ? "Topic passed!" : "Almost there"}
            </h1>
            <p className="text-muted">
              You got {correct} of {total} right
              {passed ? " — this topic is marked complete." : `. Score ${Math.round(
                PASS_RATIO * 100
              )}% to pass.`}
            </p>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => router.push(backHref)}>
                Back to topic
              </Button>
              {!passed && (
                <Button onClick={() => router.refresh()}>Try again</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {heading} · Question {index + 1} of {total}
            </p>
            <QuestionView
              key={index}
              step={step}
              onAnswered={(isRight) => {
                setAnswered(true);
                if (isRight) setCorrect((n) => n + 1);
              }}
            />
          </div>
        )}
      </div>

      {!done && (
        <div className="border-t border-border pt-5">
          <Button className="w-full" disabled={!answered} onClick={advance}>
            {index + 1 >= total ? "Finish test" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
