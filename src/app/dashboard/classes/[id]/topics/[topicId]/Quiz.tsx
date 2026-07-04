"use client";

import { useState } from "react";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
};

export function Quiz({ questions }: { questions: Question[] }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Check your understanding
      </p>
      {questions.map((q, i) => (
        <QuizItem key={i} question={q} />
      ))}
    </div>
  );
}

function QuizItem({ question }: { question: Question }) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{question.question}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const isPicked = picked === i;
          const isCorrect = i === question.correctIndex;
          const answered = picked !== null;

          let tone = "border-border bg-background/60 text-foreground hover:border-accent/50";
          if (answered && isCorrect) {
            tone = "border-green-600/40 bg-green-600/10 text-foreground";
          } else if (answered && isPicked && !isCorrect) {
            tone = "border-red-600/40 bg-red-600/10 text-foreground";
          } else if (answered) {
            tone = "border-border bg-background/60 text-muted";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
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
    </div>
  );
}
