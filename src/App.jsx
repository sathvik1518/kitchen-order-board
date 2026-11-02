import { useMemo, useState } from "react";
import { PageLayout, Stack } from "./components/Layout.jsx";
import { Input } from "./components/Input.jsx";
import { Button } from "./components/Button.jsx";
import { Modal } from "./components/Modal.jsx";
import { OrderCard } from "./components/OrderCard.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { useFetch } from "./hooks/useFetch.js";
import { fetchOrders, markReady, cancelOrder } from "./api/orders.js";

export default function App() {
  const { data: orders, loading, error, refetch, setData } = useFetch(fetchOrders);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!orders) return [];
    if (!q) return orders;
    return orders.filter(
      (o) =>
        String(o.id).includes(q) ||
        `table ${o.table}`.includes(q) ||
        o.items.some((i) => i.toLowerCase().includes(q))
    );
  }, [orders, query]);

  const removeFromList = (id) => setData((list) => list.filter((o) => o.id !== id));

  async function handleMarkReady(order) {
    setActionError(null);
    setBusyId(order.id);
    try {
      await markReady(order.id);
      removeFromList(order.id);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    const order = toCancel;
    setToCancel(null);
    setActionError(null);
    setBusyId(order.id);
    try {
      await cancelOrder(order.id);
      removeFromList(order.id);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageLayout title="Kitchen Order Board" actions={<ThemeToggle />}>
      <Stack gap="lg">
        <Input
          label="Search orders"
          type="search"
          placeholder="Order number, table or dish"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {actionError && (
          <p role="alert" className="rounded-md border border-danger bg-surface-muted p-3">
            {actionError}
          </p>
        )}

        {loading && <p style={{color:"#ff0000"}} role="status">Loading orders…</p>}
        {error && (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-md border border-danger bg-surface-muted p-3">
            <p>Could not load orders: {error.message}</p>
            <Button variant="secondary" onClick={refetch}>Try again</Button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <p role="status">{query ? "No orders match your search." : "No open orders. Kitchen is clear."}</p>
        )}

        {/* The outer box is the measuring box: columns follow ITS width, not the screen's. */}
        <div className="@container">
          <section aria-label="Open orders" className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={busyId === order.id}
                onMarkReady={handleMarkReady}
                onCancel={setToCancel}
              />
            ))}
          </section>
        </div>
      </Stack>

      <Modal open={toCancel !== null} onClose={() => setToCancel(null)} title="Cancel this order?">
        <p>
          Order #{toCancel?.id} for table {toCancel?.table} will be removed from the board.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToCancel(null)}>Keep order</Button>
          <Button variant="danger" onClick={confirmCancel}>Yes, cancel it</Button>
        </div>
      </Modal>
    </PageLayout>
  );
}