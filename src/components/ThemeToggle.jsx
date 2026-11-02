import { useState } from "react";

// Starts from whatever the script in index.html already set, so there is no mismatch.
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className="min-h-11 rounded-md border border-text-muted bg-surface px-3 font-medium text-text hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none md:min-h-9"
    >
      {dark ? "Dark theme on" : "Dark theme off"}
    </button>
  );
}