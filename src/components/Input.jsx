import { useId } from "react";

// Label is connected to the input; error is announced via aria-describedby.
export function Input({ label, error, id, ...rest }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex max-w-md flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          "min-h-11 rounded-md border bg-surface px-3 text-text placeholder:text-text-muted md:min-h-9 " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
          (error ? "border-danger" : "border-text-muted")
        }
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}