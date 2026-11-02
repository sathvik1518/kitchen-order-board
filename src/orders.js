import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, fetchOrders, markReady } from "./api";

export const ORDERS_KEY = ["orders"];

/** The list of open orders. */
export const useOrders = () => useQuery({ queryKey: ORDERS_KEY, queryFn: ({ signal }) => fetchOrders({ signal }) });

/**
 * A mutation that, when it succeeds, marks the "orders" list as out of date so it loads again.
 * Each place that calls this gets its OWN loading state, which is why each card can show its own spinner.
 */
function useOrderMutation(fn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export const useMarkReady = () => useOrderMutation(markReady);
export const useCancelOrder = () => useOrderMutation(cancelOrder);

/**
 * The search box filter. Matches the table number, the order number, or any dish name.
 * It is worked out from the list every time, so there is no second list to keep in step.
 */
export function filterOrders(orders, text) {
  const q = text.trim().toLowerCase();
  if (q === "") return orders;
  return orders.filter(
    (o) =>
      String(o.table) === q.replace(/^table\s*/, "") ||
      String(o.id).includes(q.replace(/^#/, "")) ||
      o.items.some((i) => i.name.toLowerCase().includes(q)),
  );
}
