import { Card, CardHeader, CardBody, CardFooter } from "./Card.jsx";
import { Button } from "./Button.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

export function OrderCard({ order, busy, onMarkReady, onCancel }) {
  return (
    <Card aria-label={`Order ${order.id}`}>
      <CardHeader>
        <div>
          <strong>#{order.id}</strong>
          <span className="block text-sm text-text-muted">
            Table {order.table} · {order.placedAt}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </CardHeader>
      <CardBody>
        <ul className="list-disc pl-5">
          {order.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardBody>
      <CardFooter>
        <Button loading={busy} onClick={() => onMarkReady(order)}>Mark ready</Button>
        <Button variant="danger" disabled={busy} onClick={() => onCancel(order)}>Cancel</Button>
      </CardFooter>
    </Card>
  );
}