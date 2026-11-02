// Joins class names and drops empty ones: cn("base", isActive && "active")
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}