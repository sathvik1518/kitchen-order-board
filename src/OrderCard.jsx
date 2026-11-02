import { Button, Card, CardBody, CardFooter, CardHeader, Stack } from "./components";
import { useMarkReady } from "./orders";

/** One open order. "Mark ready" has its own loading state. "Cancel" asks the board to open the confirmation. */
export default function OrderCard({ order, onCancel }) {
  const ready = useMarkReady();
  const isReady = order.status === "ready";

  return (
    <Card aria-labelledby={`order-${order.id}-title`}>
      <CardHeader>
        <Stack direction="row" justify="space-between" align="center" gap={2}>
          <h3 id={`order-${order.id}-title`} style={{ margin: 0 }}>
            Table {order.table}
          </h3>
          <span className={`badge badge--${order.status}`}>{isReady ? "Ready" : "Preparing"}</span>
        </Stack>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Order #{order.id}
        </p>
      </CardHeader>
      <CardBody>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {order.items.map((item) => (
            <li key={item.name}>
              {item.qty} × {item.name}
            </li>
          ))}
        </ul>
        {ready.isError && (
          <p role="alert" className="alert">
            Could not mark order #{order.id} ready: {ready.error.message}
          </p>
        )}
      </CardBody>
      <CardFooter>
        <Stack direction="row" gap={2} wrap>
          {!isReady && (
            <Button loading={ready.isPending} onClick={() => ready.mutate(order.id)} aria-label={`Mark order ${order.id} ready`}>
              {ready.isPending ? "Marking..." : "Mark ready"}
            </Button>
          )}
          {!isReady && (
            <Button variant="secondary" disabled={ready.isPending} onClick={() => onCancel(order)} aria-label={`Cancel order ${order.id}`}>
              Cancel
            </Button>
          )}
        </Stack>
      </CardFooter>
    </Card>
  );
}
