const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-70";

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:brightness-105 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_16px_-6px_rgba(201,100,66,0.5)]",
  secondary:
    "border border-border bg-surface/80 backdrop-blur-xl text-foreground hover:bg-surface",
  ghost: "text-foreground hover:bg-foreground/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  loadingText,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  loading?: boolean;
  loadingText?: string;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {loading ? (loadingText ?? "Working…") : children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
