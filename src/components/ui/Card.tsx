export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface/95 backdrop-blur-xl shadow-[0_1px_2px_rgba(30,25,15,0.04),0_12px_28px_-12px_rgba(30,25,15,0.18)] ${className}`}
      {...props}
    />
  );
}
