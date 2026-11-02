import { cn } from "../lib/cn.js";

// Each badge pairs a background token with its foreground token AND carries a word,
// so the status never depends on colour alone.
const statuses = {
  new: { label: "New", classes: "bg-brand text-brand-foreground" },
  ready: { label: "Ready", classes: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelled", classes: "bg-danger text-danger-foreground" },
};

export function StatusBadge({ status }) {
  const entry = statuses[status];
  if (!entry) return null;
  return (
    <span className={cn("inline-block rounded-full px-3 py-1 text-sm font-medium", entry.classes)}>
      {entry.label}
    </span>
  );
}