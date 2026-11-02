import { Button, Modal, Stack } from "./components";
import { useCancelOrder } from "./orders";

/** Asks "are you sure?" before cancelling. Stays open and shows the problem if the server says no. */
export default function CancelDialog({ order, onClose }) {
  const cancel = useCancelOrder();

  function close() {
    cancel.reset();
    onClose();
  }

  return (
    <Modal open={order !== null} onClose={close} title="Cancel this order?" dismissible={!cancel.isPending}>
      {order && (
        <>
          <p>
            Table {order.table}, order #{order.id}:{" "}
            {order.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}.
          </p>
          <p>The kitchen will stop making it. This cannot be undone.</p>
          {cancel.isError && (
            <p role="alert" className="alert">
              {cancel.error.message}
            </p>
          )}
          <Stack direction="row" gap={2} justify="flex-end">
            <Button variant="secondary" onClick={close} disabled={cancel.isPending}>
              Keep order
            </Button>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(order.id, { onSuccess: close })}>
              {cancel.isPending ? "Cancelling..." : "Cancel order"}
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
