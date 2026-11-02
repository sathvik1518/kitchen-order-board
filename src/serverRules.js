// The kitchen's orders and the rules for changing them. The dev server (vite.config.js) and the
// test server share this file, so they behave the same.

export const makeOrders = () => [
  { id: 1001, table: 4, status: "preparing", items: [{ name: "Idli", qty: 2 }, { name: "Filter Coffee", qty: 2 }] },
  { id: 1002, table: 7, status: "preparing", items: [{ name: "Masala Dosa", qty: 1 }] },
  { id: 1003, table: 2, status: "ready", items: [{ name: "Pongal", qty: 1 }, { name: "Medu Vada", qty: 2 }] },
  { id: 1004, table: 9, status: "preparing", items: [{ name: "Rava Upma", qty: 3 }] },
  { id: 1005, table: 13, status: "preparing", items: [{ name: "Idli", qty: 1 }] }, // Marking this one ready always fails
];

export const FAILING_ORDER_ID = 1005;

/** Applies a change to the list of orders. Returns { status, body } and changes `orders` only on success. */
export function applyChange(orders, id, action) {
  const order = orders.find((o) => o.id === id);
  if (!order || order.status === "cancelled") return { status: 404, body: { detail: `Order ${id} was not found.` } };

  if (action === "ready") {
    if (id === FAILING_ORDER_ID) return { status: 500, body: { detail: "The ticket printer is jammed." } };
    if (order.status !== "preparing") return { status: 409, body: { detail: `Order ${id} is already ${order.status}.` } };
    order.status = "ready";
    return { status: 200, body: order };
  }
  if (action === "cancel") {
    if (order.status !== "preparing") return { status: 409, body: { detail: `Order ${id} is already ${order.status} and cannot be cancelled.` } };
    order.status = "cancelled";
    return { status: 200, body: order };
  }
  return { status: 400, body: { detail: "Unknown action." } };
}

/** "Open" orders are the ones still on the board: preparing or ready. */
export const openOrders = (orders) => orders.filter((o) => o.status !== "cancelled");
