"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type TeachStep = { kind: "teach"; title: string; body: string };
type QuestionStep = {
  kind: "question";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
type LessonStep = TeachStep | QuestionStep;

export function LessonPlayer({
  title,
  steps,
  backHref,
  nextHref,
}: {
  title: string;
  steps: LessonStep[];
  backHref: string;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [questionsSeen, setQuestionsSeen] = useState(0);
  const [done, setDone] = useState(false);

  const step = steps[index];
  const total = steps.length;
  const progress = done ? 100 : Math.round((index / total) * 100);

  function advance() {
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  }

  function checkAnswer(choice: number, correctIndex: number) {
    if (picked !== null) return;
    setPicked(choice);
    setQuestionsSeen((n) => n + 1);
    if (choice === correctIndex) setCorrectCount((n) => n + 1);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col p-6 sm:p-10">
      {/* Progress bar + exit */}
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
              {nextHref && (
                <Button onClick={() => router.push(nextHref)}>Next lesson</Button>
              )}
            </div>
          </div>
        ) : step.kind === "teach" ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {title}
            </p>
            <h2 className="font-serif text-2xl text-foreground">{step.title}</h2>
            {step.body.split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-wrap leading-relaxed text-foreground">
                {para}
              </p>
            ))}
          </div>
        ) : (
          <QuestionCard
            step={step}
            picked={picked}
            onPick={(choice) => checkAnswer(choice, step.correctIndex)}
          />
        )}
      </div>

      {/* Footer action */}
      {!done && (
        <div className="border-t border-border pt-5">
          {step.kind === "teach" ? (
            <Button className="w-full" onClick={advance}>
              Continue
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={picked === null}
              onClick={advance}
            >
              {index + 1 >= total ? "Finish" : "Continue"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  step,
  picked,
  onPick,
}: {
  step: QuestionStep;
  picked: number | null;
  onPick: (choice: number) => void;
}) {
  const answered = picked !== null;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-foreground">{step.question}</h2>
      <div className="flex flex-col gap-3">
        {step.options.map((option, i) => {
          const isPicked = picked === i;
          const isCorrect = i === step.correctIndex;

          let tone = "border-border bg-background/60 text-foreground hover:border-accent/50";
          if (answered && isCorrect) {
            tone = "border-green-600/50 bg-green-600/10 text-foreground";
          } else if (answered && isPicked && !isCorrect) {
            tone = "border-red-600/50 bg-red-600/10 text-foreground";
          } else if (answered) {
            tone = "border-border bg-background/60 text-muted";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
            >
              {option}
              {answered && isCorrect && <span className="ml-2 text-green-600">✓</span>}
              {answered && isPicked && !isCorrect && (
                <span className="ml-2 text-red-600">✗</span>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-foreground">
          {picked === step.correctIndex
            ? step.explanation
            : `Not quite. ${step.explanation}`}
        </p>
      )}
    </div>
  );
}
