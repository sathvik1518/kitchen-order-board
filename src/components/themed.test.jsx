   import { render, screen } from "@testing-library/react";
   import userEvent from "@testing-library/user-event";
   import { StatusBadge } from "./StatusBadge.jsx";
   import { ThemeToggle } from "./ThemeToggle.jsx";
   import { OrderCard } from "./OrderCard.jsx";

   beforeEach(() => {
     document.documentElement.classList.remove("dark");
     localStorage.clear();
   });

   test.each([
     ["new", "New"],
     ["ready", "Ready"],
     ["cancelled", "Cancelled"],
   ])("StatusBadge shows the word %s, not only a colour", (status, label) => {
     render(<StatusBadge status={status} />);
     expect(screen.getByText(label)).toBeInTheDocument();
   });

   test("ThemeToggle switches the dark class, remembers the choice and reports its state", async () => {
     render(<ThemeToggle />);
     const toggle = screen.getByRole("button", { name: /dark theme off/i });
     expect(toggle).toHaveAttribute("aria-pressed", "false");

     await userEvent.click(toggle);
     expect(document.documentElement).toHaveClass("dark");
     expect(localStorage.getItem("theme")).toBe("dark");
     expect(screen.getByRole("button", { name: /dark theme on/i })).toHaveAttribute("aria-pressed", "true");

     await userEvent.click(screen.getByRole("button", { name: /dark theme on/i }));
     expect(document.documentElement).not.toHaveClass("dark");
     expect(localStorage.getItem("theme")).toBe("light");
   });

   test("ThemeToggle starts from the class the page script already set", () => {
     document.documentElement.classList.add("dark");
     render(<ThemeToggle />);
     expect(screen.getByRole("button", { name: /dark theme on/i })).toHaveAttribute("aria-pressed", "true");
   });

   test("OrderCard buttons are found by name and report clicks upward", async () => {
     const order = { id: 101, table: 4, items: ["Pizza"], status: "new", placedAt: "12:02" };
     const onMarkReady = vi.fn();
     const onCancel = vi.fn();
     render(<OrderCard order={order} busy={false} onMarkReady={onMarkReady} onCancel={onCancel} />);

     expect(screen.getByText("New")).toBeInTheDocument();
     await userEvent.click(screen.getByRole("button", { name: /mark ready/i }));
     await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
     expect(onMarkReady).toHaveBeenCalledWith(order);
     expect(onCancel).toHaveBeenCalledWith(order);
   });