import { cn } from "../lib/cn.js";

export function Card({ className, children, ...rest }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-surface-muted transition-shadow hover:shadow-sm motion-reduce:transition-none",
        className
      )}
      {...rest}
    >
      {children}
    </article>
  );
}
export function CardHeader({ className, children }) {
  return (
    <header className={cn("flex items-center justify-between gap-2 border-b border-border px-4 py-3", className)}>
      {children}
    </header>
  );
}
export function CardBody({ className, children }) {
  return <div className={cn("flex-1 px-4 py-3", className)}>{children}</div>;
}
export function CardFooter({ className, children }) {
  return <footer className={cn("flex gap-2 border-t border-border px-4 py-3", className)}>{children}</footer>;
}