// A fake kitchen API. Same shape as a real fetch: async, can be slow, can fail.
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// status is one of: "new", "ready", "cancelled" (the same words StatusBadge knows)
let orders = [
  { id: 101, table: 4, items: ["Margherita pizza", "Garlic bread"], status: "new", placedAt: "12:02" },
  { id: 102, table: 7, items: ["Paneer tikka", "Butter naan x2"], status: "new", placedAt: "12:05" },
  { id: 103, table: 2, items: ["Veg biryani"], status: "new", placedAt: "12:09" },
  { id: 104, table: 9, items: ["Pasta alfredo", "Caesar salad"], status: "new", placedAt: "12:11" },
  { id: 105, table: 1, items: ["Masala dosa", "Filter coffee"], status: "new", placedAt: "12:14" },
];

export async function fetchOrders({ signal } = {}) {
  await delay(600);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return orders.filter((o) => o.status === "new").map((o) => ({ ...o }));
}

export async function markReady(id) {
  await delay(900);
  // Order 103 always fails, so you can see the error path.
  if (id === 103) throw new Error("Printer offline. Could not mark order 103 ready.");
  orders = orders.map((o) => (o.id === id ? { ...o, status: "ready" } : o));
}

export async function cancelOrder(id) {
  await delay(700);
  orders = orders.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o));
}