import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { applyChange, makeOrders, openOrders } from "../serverRules";

let orders = makeOrders();
export const resetOrders = () => {
  orders = makeOrders();
  requests.length = 0;
};
export const requests = []; // a record of every call, e.g. "GET /api/orders"

export function gate() {
  let open;
  const promise = new Promise((resolve) => (open = resolve));
  return { promise, open };
}

export const handlers = [
  http.get("/api/orders", () => {
    requests.push("GET /api/orders");
    return HttpResponse.json(openOrders(orders));
  }),
  http.post("/api/orders/:id/:action", ({ params }) => {
    requests.push(`POST /api/orders/${params.id}/${params.action}`);
    const { status, body } = applyChange(orders, Number(params.id), params.action);
    return HttpResponse.json(body, { status });
  }),
];

export const server = setupServer(...handlers);
