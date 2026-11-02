import { cn } from "../lib/cn.js";

// Full class names in a lookup object, so Tailwind can find them when it scans the file.
const variants = {
  // Hover uses its own tokens, not "/90" transparency: fading the colour toward the page
  // lowered white-on-brand contrast to about 4.3:1 in the light theme (AA needs 4.5).
  primary: "bg-brand text-brand-foreground hover:bg-brand-hover",
  secondary: "border border-text-muted bg-surface text-text hover:bg-surface-muted",
  danger: "bg-danger text-danger-foreground hover:bg-danger-hover",
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:opacity-60 disabled:cursor-not-allowed motion-reduce:transition-none md:min-h-9";

// Safe default type="button" so a Button inside a form never submits by accident.
export function Button({ variant = "primary", loading = false, disabled, type = "button", className, children, ...rest }) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? "Working…" : children}
    </button>
  );
}