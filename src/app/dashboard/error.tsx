"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="font-serif text-2xl text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  );
}
