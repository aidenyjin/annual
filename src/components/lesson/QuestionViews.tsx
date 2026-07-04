"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { McqStep, MultiStep, TrueFalseStep, QuestionStep } from "@/lib/lessons";

export function QuestionView({
  step,
  onAnswered,
}: {
  step: QuestionStep;
  onAnswered: (correct: boolean) => void;
}) {
  if (step.kind === "mcq") return <McqView step={step} onAnswered={onAnswered} />;
  if (step.kind === "truefalse")
    return <TrueFalseView step={step} onAnswered={onAnswered} />;
  return <MultiView step={step} onAnswered={onAnswered} />;
}

type OptionState = "idle" | "correct" | "wrong" | "dim";

function optionTone(state: OptionState) {
  switch (state) {
    case "correct":
      return "border-green-600/50 bg-green-600/10 text-foreground";
    case "wrong":
      return "border-red-600/50 bg-red-600/10 text-foreground";
    case "dim":
      return "border-border bg-background/60 text-muted";
    default:
      return "border-border bg-background/60 text-foreground hover:border-accent/50";
  }
}

function Feedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-foreground">
      {correct ? "Correct. " : "Not quite. "}
      {explanation}
    </p>
  );
}

function McqView({ step, onAnswered }: { step: McqStep; onAnswered: (c: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  function pick(i: number) {
    if (answered) return;
    setPicked(i);
    onAnswered(i === step.correctIndex);
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-foreground">{step.question}</h2>
      <div className="flex flex-col gap-3">
        {step.options.map((option, i) => {
          const state: OptionState = !answered
            ? "idle"
            : i === step.correctIndex
              ? "correct"
              : picked === i
                ? "wrong"
                : "dim";
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => pick(i)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${optionTone(
                state
              )}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <Feedback correct={picked === step.correctIndex} explanation={step.explanation} />
      )}
    </div>
  );
}

function TrueFalseView({
  step,
  onAnswered,
}: {
  step: TrueFalseStep;
  onAnswered: (c: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const answered = picked !== null;

  function pick(value: boolean) {
    if (answered) return;
    setPicked(value);
    onAnswered(value === step.answer);
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-foreground">{step.statement}</h2>
      <div className="flex gap-3">
        {[true, false].map((value) => {
          const state: OptionState = !answered
            ? "idle"
            : value === step.answer
              ? "correct"
              : picked === value
                ? "wrong"
                : "dim";
          return (
            <button
              key={String(value)}
              type="button"
              disabled={answered}
              onClick={() => pick(value)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-default ${optionTone(
                state
              )}`}
            >
              {value ? "True" : "False"}
            </button>
          );
        })}
      </div>
      {answered && (
        <Feedback correct={picked === step.answer} explanation={step.explanation} />
      )}
    </div>
  );
}

function MultiView({ step, onAnswered }: { step: MultiStep; onAnswered: (c: boolean) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const correctSet = new Set(step.correctIndices);

  const isCorrect =
    selected.size === correctSet.size && [...selected].every((i) => correctSet.has(i));

  function toggle(i: number) {
    if (checked) return;
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  function check() {
    if (checked || selected.size === 0) return;
    setChecked(true);
    onAnswered(isCorrect);
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-xl text-foreground">{step.question}</h2>
      <p className="-mt-3 text-xs text-muted">Select all that apply.</p>
      <div className="flex flex-col gap-3">
        {step.options.map((option, i) => {
          const isSel = selected.has(i);
          let state: OptionState = "idle";
          if (checked) {
            if (correctSet.has(i)) state = "correct";
            else if (isSel) state = "wrong";
            else state = "dim";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => toggle(i)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${optionTone(
                state
              )}`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isSel ? "border-accent bg-accent text-accent-foreground" : "border-border"
                }`}
              >
                {isSel && "✓"}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {!checked ? (
        <Button variant="secondary" disabled={selected.size === 0} onClick={check}>
          Check
        </Button>
      ) : (
        <Feedback correct={isCorrect} explanation={step.explanation} />
      )}
    </div>
  );
}
