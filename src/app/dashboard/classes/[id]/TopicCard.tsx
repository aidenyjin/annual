import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function TopicCard({
  href,
  heading,
  weekLabel,
  dueDate,
  description,
  completed,
}: {
  href: string;
  heading: string;
  weekLabel?: string | null;
  dueDate?: string | null;
  description?: string | null;
  completed?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(30,25,15,0.06),0_16px_32px_-12px_rgba(30,25,15,0.24)]">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            {completed && <span className="text-green-600">✓</span>}
            {heading}
          </h3>
          {weekLabel && (
            <span className="shrink-0 text-xs text-muted">{weekLabel}</span>
          )}
        </div>
        {dueDate && <p className="mt-1 text-xs text-accent">Due {dueDate}</p>}
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        )}
      </Card>
    </Link>
  );
}
