import { useState } from "react";
import CancelDialog from "./CancelDialog";
import { Button, Input, Stack } from "./components";
import OrderCard from "./OrderCard";
import { filterOrders, useOrders } from "./orders";

export default function OrderBoard() {
  const [search, setSearch] = useState("");
  const [toCancel, setToCancel] = useState(null); // the order the dialog is about, or null
  const { data, error, isPending, refetch, isFetching } = useOrders();

  if (isPending) return <p role="status">Loading orders...</p>;
  if (error) {
    return (
      <div role="alert">
        <p className="alert">Could not load orders: {error.message}</p>
        <Button onClick={() => refetch()} loading={isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const shown = filterOrders(data, search);

  return (
    <Stack gap={4}>
      <Input
        label="Search orders"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        hint="By table number, order number or dish."
      />

      <p role="status" className="muted" style={{ margin: 0 }}>
        {data.length === 0 ? "No open orders." : `Showing ${shown.length} of ${data.length} open orders`}
      </p>

      {data.length > 0 && shown.length === 0 && <p>No orders match “{search.trim()}”.</p>}

      <ul className="board-grid">
        {shown.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} onCancel={setToCancel} />
          </li>
        ))}
      </ul>

      <CancelDialog order={toCancel} onClose={() => setToCancel(null)} />
    </Stack>
  );
}
