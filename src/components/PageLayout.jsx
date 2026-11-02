/**
 * The frame of every page: a "skip to main content" link first, then an optional header, then ONE <main>.
 * Keyboard users press Tab once and Enter to jump past the header.
 * The main element has tabIndex -1 so the jump moves focus there (not only the scroll position).
 */
export default function PageLayout({ header, children }) {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      {header && <header>{header}</header>}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
