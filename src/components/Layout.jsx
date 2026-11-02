const gaps = { sm: "gap-2", md: "gap-4", lg: "gap-6" };

// Lookup object of full class names instead of building "gap-" + size from strings.
export function Stack({ gap = "md", as: Tag = "div", children }) {
  return <Tag className={`flex flex-col ${gaps[gap]}`}>{children}</Tag>;
}

export function PageLayout({ title, actions, children }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Skip to main content
      </a>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold">{title}</h1>
        {actions}
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {children}
      </main>
    </>
  );
}