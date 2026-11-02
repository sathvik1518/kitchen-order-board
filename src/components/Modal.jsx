import { useEffect, useRef } from "react";

// Built on the native <dialog>: Escape and focus trapping come from the browser.
// m-auto is needed because Tailwind's reset removes the dialog's default centring margin.
export function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="m-auto w-[90%] max-w-md rounded-xl bg-surface p-6 text-text backdrop:bg-overlay"
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        // Backdrop click: the click target is the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
    >
      <h2 id="modal-title" className="mb-2 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}