"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

export function HoverTopic({
  heading,
  weekLabel,
  dueDate,
  sourceExcerpt,
}: {
  heading: string;
  weekLabel?: string | null;
  dueDate?: string | null;
  sourceExcerpt?: string | null;
}) {
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  async function handleHover() {
    if (hasFetched || loading) return;
    setLoading(true);
    setHasFetched(true);
    try {
      const res = await fetch("/api/hover-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heading, context: sourceExcerpt ?? undefined }),
      });
      const data = await res.json();
      setDescription(res.ok ? data.description : "Couldn't load a description.");
    } catch {
      setDescription("Couldn't load a description.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      onMouseEnter={handleHover}
      className="p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(30,25,15,0.06),0_16px_32px_-12px_rgba(30,25,15,0.24)]"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium text-foreground">{heading}</h3>
        {weekLabel && (
          <span className="shrink-0 text-xs text-muted">{weekLabel}</span>
        )}
      </div>
      {dueDate && <p className="mt-1 text-xs text-accent">Due {dueDate}</p>}
      <p className="mt-2 min-h-[1.25rem] text-sm text-muted">
        {loading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
          </span>
        ) : (
          description
        )}
      </p>
    </Card>
  );
}
