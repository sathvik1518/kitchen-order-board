import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button.jsx";
import { Input } from "./Input.jsx";
import { Modal } from "./Modal.jsx";

test("Button defaults to type=button and does not submit a form", async () => {
  const onSubmit = vi.fn((e) => e.preventDefault());
  render(<form onSubmit={onSubmit}><Button>Cancel</Button></form>);
  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test("Input is labelled and shows its error", () => {
  render(<Input label="Email" error="Enter a valid email." />);
  const field = screen.getByLabelText("Email");
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
});

test("Modal calls onClose when the backdrop is clicked, not when its content is", async () => {
  const onClose = vi.fn();
  render(
    <Modal open onClose={onClose} title="Cancel this order?">
      <p>Are you sure?</p>
    </Modal>
  );
  await userEvent.click(screen.getByText("Are you sure?"));
  expect(onClose).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("dialog"));
  expect(onClose).toHaveBeenCalledTimes(1);
});