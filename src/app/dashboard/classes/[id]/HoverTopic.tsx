"use client";

import { useState } from "react";

export function HoverTopic({
  heading,
  weekLabel,
  dueDate,
}: {
  heading: string;
  weekLabel?: string | null;
  dueDate?: string | null;
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
        body: JSON.stringify({ heading }),
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
    <div
      onMouseEnter={handleHover}
      className="rounded-lg border border-black/10 dark:border-white/10 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium">{heading}</h3>
        {weekLabel && <span className="text-xs opacity-60">{weekLabel}</span>}
      </div>
      {dueDate && <p className="text-xs opacity-60 mt-1">Due {dueDate}</p>}
      <p className="text-sm opacity-80 mt-2 min-h-[1.25rem]">
        {loading ? "…" : description}
      </p>
    </div>
  );
}
