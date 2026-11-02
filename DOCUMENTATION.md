# Kitchen Order Board: A Page Built Only from a Small Set of Reusable Components

**Day 28 Mini Capstone, Components**  
**Project folder:** `kitchen-order-board`

---

## 1. Goal

The Kitchen Order Board. The task (Day 28 Deep Dive, Mini Capstone) asked for a page that:

1. Lists **open orders as cards**.
2. Has a **search box** that filters them.
3. Gives each card a **"Mark ready" button with a loading state**.
4. Gives each card a **"Cancel" button that opens a confirmation dialog**.
5. Uses **only the course's components**: `Button`, `Input`, `Card` with `CardHeader`, `CardBody` and `CardFooter`, `Modal` (built on the native `<dialog>`), `Stack`, and `PageLayout` (with a skip link and a `<main>`).
6. Is connected to the **Day 27 data fetching** (TanStack Query: a query for the list, and mutations that mark the list out of date).

The task text was cut off after the data-fetching line in the screenshot, so this project covers everything visible.

Think of a set of kitchen tools. A knife, a pan and a chopping board are not a recipe. They are small tools that each do one job well, and a recipe (the page) uses only those. If a cook needs a new shape of pan, they make a better pan, not a one-off. The page here never uses a raw `<button>` or `<dialog>`: it always goes through the component.

The rules this project is built around:

- **Components own their accessibility.** `Button` knows how to be busy. `Input` links its label, hint and error. `Modal` handles focus and Escape. The page cannot forget them.
- **Each button has its own loading state.** Pressing Mark ready on one card must not freeze the others.
- **A destructive action asks first**, and the dialog stays open and explains if the server refuses.
- **Search is worked out, not stored**, and makes no request.

---

## 2. Tools

| Tool | Role |
|---|---|
| React 19 (JavaScript, JSX) | Components |
| TanStack Query 5 | Fetching the list and the two mutations (Day 27's topic) |
| Vite | Dev server and build. A small plugin in `vite.config.js` is the fake server for `npm run dev` |
| Vitest + jsdom + React Testing Library + MSW | Tests, with a fake server that can be held back or made to fail |
| Playwright (Chromium), optional | A real-browser check of the dialog, focus and skip link |

---

## 3. Project structure

```
kitchen-order-board/
├── package.json
├── vite.config.js            (also holds the fake API for npm run dev)
├── index.html
├── .gitignore
├── README.md
├── DOCUMENTATION.md
├── scripts/
│   └── check-browser.mjs     (real-browser check, optional)
└── src/
    ├── components/
    │   ├── Button.jsx, Input.jsx, Card.jsx, Modal.jsx, Stack.jsx, PageLayout.jsx
    │   ├── index.js          (one place to import them all)
    │   ├── components.css
    │   └── components.test.jsx
    ├── serverRules.js        (the orders and the rules; shared by the dev server and the tests)
    ├── api.js                (requestJSON, ApiError, fetchOrders, markReady, cancelOrder)
    ├── orders.js             (useOrders, useMarkReady, useCancelOrder, filterOrders)
    ├── OrderCard.jsx         (one order)
    ├── CancelDialog.jsx      (the confirmation)
    ├── OrderBoard.jsx        (search + grid + dialog)
    ├── App.jsx, main.jsx
    ├── orders.test.js, App.test.jsx
    └── test/
        ├── setup.js
        └── server.js
```

---

## 4. Setup commands

```bash
npm create vite@latest kitchen-order-board -- --template react
cd kitchen-order-board
npm install @tanstack/react-query
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
```

**`package.json` scripts**

```json
"dev": "vite",
"build": "vite build",
"test": "vitest run"
```

---

## 5. The idea: small components with built-in behavior, and one mutation per button

```
 PageLayout  (skip link, header, <main id="main" tabindex="-1">)
   └─ OrderBoard
        ├─ Input  "Search orders"          filterOrders(data, search)   (worked out, no request)
        ├─ <ul> of OrderCard
        │     └─ Card ▸ CardHeader (Stack: title + status) ▸ CardBody (items, error) ▸ CardFooter (Stack: Buttons)
        │           Mark ready  ──▶ useMarkReady() ── its OWN loading state
        │           Cancel      ──▶ onCancel(order) ──▶ OrderBoard remembers which order
        └─ CancelDialog (Modal)  ──▶ useCancelOrder()
                                       on success: invalidate ["orders"] and close
```

**Data flow.** `useOrders()` loads `["orders"]`. When a mutation succeeds, `invalidateQueries({ queryKey: ["orders"] })` marks the list out of date and TanStack Query loads it again. The card then shows "Ready", or disappears if it was cancelled. The mutation stays "pending" until that reload finishes, so the spinner does not stop early.

**Why each card has its own loading state.** `OrderCard` calls `useMarkReady()` itself, so every card has its own mutation. Pressing the button on table 4 shows a spinner on table 4 only (a test checks that table 7's button stays enabled).

**What the `Button` guarantees.** `loading` makes it `disabled` and `aria-busy`, keeps its label, and swallows clicks, so a double click cannot send two requests (a test double-clicks and counts one request). Its `type` is `button` by default, so it never submits a form by accident.

**What the `Modal` does.** It wraps the browser's native `<dialog>`: `showModal()` makes the page behind inert, moves focus in, and gives Escape and focus return for free. The component adds three things: `open` is connected to `showModal()` and `close()`; Escape asks `onClose` instead of closing by itself, so the page can say no; and `dismissible={false}` blocks Escape and outside clicks while something is being saved.

**What the `PageLayout` does.** The first Tab stop is a "Skip to main content" link. `<main>` has `tabIndex={-1}`, so the jump moves keyboard focus there, not only the scroll position.

**Why "cancel" is a two-step.** Cancelling is hard to undo. The dialog names the table and the dishes, and the safe button (Keep order) is first. If the server says no (for example the order is already ready), the dialog stays open and shows why.

---

## 6. The code

### `src/components/Button.jsx`

```jsx
/**
 * variant: "primary" | "secondary" | "danger"
 * loading: shows a spinner, disables the button and keeps the label (so the button does not change size or meaning).
 * A loading button is `disabled` AND `aria-busy`, so it cannot be pressed twice and screen readers know why.
 */
export default function Button({ variant = "primary", loading = false, disabled = false, type = "button", children, onClick, ...rest }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      onClick={(e) => {
        if (!loading && !disabled) onClick?.(e);
      }}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
```

### `src/components/Input.jsx`

```jsx
import { useId } from "react";

/** A labelled text input. The label, hint and error are all connected to the input for screen readers. */
export default function Input({ label, hint, error, type = "text", ...rest }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`input-field${error ? " input-field--invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
```

### `src/components/Card.jsx` (Card, CardHeader, CardBody, CardFooter)

```jsx
/** A card is a set of parts you put together: <Card><CardHeader/><CardBody/><CardFooter/></Card>. */
export function Card({ as: Tag = "article", children, ...rest }) {
  return (
    <Tag className="card" {...rest}>
      {children}
    </Tag>
  );
}
export const CardHeader = ({ children }) => <div className="card__header">{children}</div>;
export const CardBody = ({ children }) => <div className="card__body">{children}</div>;
export const CardFooter = ({ children }) => <div className="card__footer">{children}</div>;
```

### `src/components/Stack.jsx`

```jsx
/** Lays children out in a row or column with an even gap. gap is in steps of 4px. */
export default function Stack({ direction = "column", gap = 2, align, justify, wrap = false, as: Tag = "div", children, ...rest }) {
  return (
    <Tag
      className="stack"
      style={{ flexDirection: direction, gap: `calc(var(--space) * ${gap})`, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

### `src/components/PageLayout.jsx` (skip link and main)

```jsx
/**
 * The frame of every page: a "skip to main content" link first, then an optional header, then ONE <main>.
 * Keyboard users press Tab once and Enter to jump past the header.
 * The main element has tabIndex -1 so the jump moves focus there (not only the scroll position).
 */
export default function PageLayout({ header, children }) {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      {header && <header>{header}</header>}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
```

### `src/components/Modal.jsx` (native dialog)

```jsx
import { useEffect, useId, useRef } from "react";

/**
 * A modal built on the browser's own <dialog>. The browser gives us, for free:
 * focus moves into the dialog and comes back to the button that opened it, the page behind is
 * inert, and Escape closes it. This component only connects `open` to showModal() and close().
 *
 *   open         true shows it, false hides it
 *   onClose      called when the person dismisses it (Escape, clicking outside, or a Close action)
 *   dismissible  false blocks Escape and outside clicks, for example while something is being saved
 */
export default function Modal({ open, onClose, title, dismissible = true, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape. Stop the browser closing it itself; we decide.
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={() => {
        // The browser closed it (for example a form with method="dialog"). Keep our state in step.
        if (open) onClose();
      }}
      onClick={(e) => {
        // A click on the dark area is a click on the <dialog> element itself, not on its content.
        if (e.target === ref.current && dismissible) onClose();
      }}
    >
      <div className="modal__inner">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
```

### `src/components/index.js`

```js
export { default as Button } from "./Button";
export { Card, CardBody, CardFooter, CardHeader } from "./Card";
export { default as Input } from "./Input";
export { default as Modal } from "./Modal";
export { default as PageLayout } from "./PageLayout";
export { default as Stack } from "./Stack";
import "./components.css";
```

### `src/components/components.css`

```css
/* Plain CSS for the shared components. Colors come from these variables only. */
:root {
  --c-bg: #faf7f2;
  --c-surface: #ffffff;
  --c-text: #1c1917;
  --c-muted: #57534e;
  --c-border: #d6d3d1;
  --c-primary: #c2410c;
  --c-primary-hover: #9a3412;
  --c-on-primary: #ffffff;
  --c-danger: #b91c1c;
  --c-danger-hover: #991b1b;
  --c-focus: #1d4ed8;
  --space: 4px;
  --radius: 10px;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--c-bg); color: var(--c-text); font-family: system-ui, sans-serif; }
:focus-visible { outline: 3px solid var(--c-focus); outline-offset: 2px; }

.skip-link { position: absolute; left: 8px; top: -100px; background: var(--c-surface); color: var(--c-text); padding: 12px 16px; border-radius: var(--radius); z-index: 100; }
.skip-link:focus { top: 8px; }
.page { max-width: 960px; margin: 0 auto; padding: calc(var(--space) * 6) calc(var(--space) * 4); }
.page main:focus { outline: none; }

.stack { display: flex; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; font: inherit; font-weight: 600; border-radius: var(--radius); border: 1px solid transparent; cursor: pointer; }
.btn--primary { background: var(--c-primary); color: var(--c-on-primary); }
.btn--primary:hover:not(:disabled) { background: var(--c-primary-hover); }
.btn--secondary { background: var(--c-surface); color: var(--c-text); border-color: var(--c-border); }
.btn--danger { background: var(--c-danger); color: var(--c-on-primary); }
.btn--danger:hover:not(:disabled) { background: var(--c-danger-hover); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn__spinner { width: 1em; height: 1em; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.input-field { display: flex; flex-direction: column; gap: 4px; }
.input-field label { font-weight: 600; }
.input-field input { min-height: 44px; padding: 0 12px; font: inherit; border: 1px solid var(--c-border); border-radius: var(--radius); background: var(--c-surface); color: var(--c-text); }
.input-field--invalid input { border-color: var(--c-danger); }
.input-field .hint { margin: 0; color: var(--c-muted); font-size: 0.875rem; }
.input-field .error { margin: 0; color: var(--c-danger); font-size: 0.875rem; }

.card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--radius); display: flex; flex-direction: column; }
.card__header { padding: 16px 16px 0; }
.card__body { padding: 12px 16px; flex: 1; }
.card__footer { padding: 0 16px 16px; }

.modal { border: 1px solid var(--c-border); border-radius: var(--radius); padding: 0; background: var(--c-surface); color: var(--c-text); max-width: min(32rem, calc(100vw - 32px)); width: 100%; }
.modal::backdrop { background: rgb(0 0 0 / 0.5); }
.modal__inner { padding: 20px; }
.modal h2 { margin-top: 0; }

.board-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; border: 1px solid currentColor; }
.badge--preparing { color: #92400e; }
.badge--ready { color: #166534; }
.muted { color: var(--c-muted); }
.alert { color: var(--c-danger); margin: 0; }
```

### `src/serverRules.js`

```js
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
```

### `src/api.js`

```js
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** fetch only fails on a dead network. A 404 or 500 is a "successful" fetch, so res.ok is checked. */
export async function requestJSON(url, { method = "GET", signal } = {}) {
  let res;
  try {
    res = await fetch(url, { method, signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the server.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) throw new ApiError(typeof data?.detail === "string" ? data.detail : res.statusText || `HTTP ${res.status}`, res.status);
  return data;
}

export const fetchOrders = ({ signal } = {}) => requestJSON("/api/orders", { signal });
export const markReady = (id) => requestJSON(`/api/orders/${id}/ready`, { method: "POST" });
export const cancelOrder = (id) => requestJSON(`/api/orders/${id}/cancel`, { method: "POST" });
```

### `src/orders.js` (queries, mutations, search)

```js
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
```

### `src/OrderCard.jsx` (Mark ready with its own loading state)

```jsx
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
```

### `src/CancelDialog.jsx` (confirmation)

```jsx
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
```

### `src/OrderBoard.jsx`

```jsx
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
```

### `src/App.jsx`

```jsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PageLayout } from "./components";
import OrderBoard from "./OrderBoard";

export default function App({ client }) {
  // One client for the life of the app. Tests pass their own, with retries turned off.
  const [queryClient] = useState(() => client ?? new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <PageLayout header={<h1>Kitchen order board</h1>}>
        <OrderBoard />
      </PageLayout>
    </QueryClientProvider>
  );
}
```

### `src/main.jsx`

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import App from "./App";

// http://localhost:5173/?fail=1 makes the first load fail, to see the error screen and "Try again".
const fail = new URLSearchParams(window.location.search).get("fail");
if (fail) {
  const realFetch = window.fetch;
  let first = true;
  window.fetch = (url, init) => {
    if (first && String(url).startsWith("/api/orders")) {
      first = false;
      return realFetch("/api/orders?fail=1", init);
    }
    return realFetch(url, init);
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App client={new QueryClient({ defaultOptions: { queries: { retry: false } } })} />
  </StrictMode>,
);
```

### `vite.config.js` (test setup and the fake API for npm run dev)

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { applyChange, makeOrders, openOrders } from "./src/serverRules.js";

/**
 * A tiny fake server for `npm run dev`, using the SAME rules as the tests (src/serverRules.js).
 *   GET  /api/orders              (add ?fail=1 to make it fail)
 *   POST /api/orders/:id/ready    (order 1005 always fails, to show the error state)
 *   POST /api/orders/:id/cancel
 * It answers slowly on purpose, so the loading states can be seen. It forgets everything on restart.
 */
function fakeApi() {
  const orders = makeOrders();
  return {
    name: "fake-api",
    configureServer(server) {
      server.middlewares.use("/api", (req, res) => {
        const url = new URL(req.url, "http://localhost");
        const send = (status, body, delay = 800) =>
          setTimeout(() => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          }, delay);

        if (req.method === "GET" && url.pathname === "/orders") {
          if (url.searchParams.get("fail")) return send(500, { detail: "The kitchen is closed." });
          return send(200, openOrders(orders));
        }
        const match = url.pathname.match(/^\/orders\/(\d+)\/(ready|cancel)$/);
        if (req.method === "POST" && match) {
          const { status, body } = applyChange(orders, Number(match[1]), match[2]);
          return send(status, body, 1200);
        }
        send(404, { detail: "Not found." }, 0);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fakeApi()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
```

### `scripts/check-browser.mjs` (real-browser check)

```js
// A REAL-BROWSER check. jsdom has no real <dialog>, focus handling or layout, so this runs the page in Chromium.
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// Run:  node scripts/check-browser.mjs
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 5199;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 3000));

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector("article");
  const active = () => page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent.slice(0, 40), inDialog: !!document.activeElement.closest("dialog") }));

  // skip link
  await page.keyboard.press("Tab");
  check("first Tab lands on the skip link", (await active()).text === "Skip to main content");
  await page.keyboard.press("Enter");
  check("Enter on the skip link moves focus to <main>", (await active()).id === "main");

  // touch targets
  const heights = await page.$$eval("button", (bs) => bs.map((b) => b.getBoundingClientRect().height));
  check("every button is at least 44px tall", heights.every((h) => h >= 44), `smallest ${Math.min(...heights)}px`);

  // search
  await page.getByLabel("Search orders").fill("dosa");
  check("search narrows the cards to 1", (await page.$$("article")).length === 1);
  await page.getByLabel("Search orders").fill("");

  // dialog: open, focus, trap, Escape, focus return
  const cancel1001 = page.getByRole("button", { name: "Cancel order 1001" });
  await cancel1001.focus();
  await cancel1001.press("Enter");
  check("the dialog is open and is a real modal (:modal)", await page.evaluate(() => document.querySelector("dialog").matches(":modal")));
  check("focus moved inside the dialog", (await active()).inDialog);
  // Tab past the last button may hand focus to the browser's own toolbar (activeElement becomes BODY).
  // That is fine. What must never happen is focus landing on the page behind the dialog.
  let stayed = true;
  const seen = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const a = await active();
    seen.push(a.inDialog ? a.text : a.tag);
    if (!a.inDialog && a.tag !== "BODY") stayed = false;
  }
  check("Tab never reaches the page behind the dialog (8 presses)", stayed, seen.join(" > "));
  await page.keyboard.press("Escape");
  check("Escape closes it", !(await page.evaluate(() => document.querySelector("dialog").open)));
  check("focus returns to the Cancel button that opened it", (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === "Cancel order 1001");

  // outside click
  await cancel1001.click();
  await page.mouse.click(5, 5);
  check("clicking the dark area closes it", !(await page.evaluate(() => document.querySelector("dialog").open)));

  // confirm: cannot dismiss while saving
  await cancel1001.click();
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page.waitForSelector('button[aria-busy="true"]');
  await page.keyboard.press("Escape");
  check("Escape is ignored while the cancel is being saved", await page.evaluate(() => document.querySelector("dialog").open));
  await page.waitForFunction(() => !document.querySelector("dialog").open, null, { timeout: 8000 });
  check("after saving, the dialog closes and the order is gone", (await page.$$("article")).length === 4 && (await page.getByText("Order #1001").count()) === 0);

  // mark ready: loading state on one card
  await page.getByRole("button", { name: "Mark order 1002 ready" }).click();
  const busy = await page.evaluate(() => {
    const b = document.querySelector('[aria-label="Mark order 1002 ready"]');
    return { disabled: b.disabled, busy: b.getAttribute("aria-busy"), spinner: !!b.querySelector(".btn__spinner") };
  });
  check("Mark ready shows a spinner and is disabled while saving", busy.disabled && busy.busy === "true" && busy.spinner);
  const otherEnabled = await page.evaluate(() => !document.querySelector('[aria-label="Mark order 1004 ready"]').disabled);
  check("another card's button stays enabled", otherEnabled);
  await page.getByRole("article", { name: /Table 7/ }).getByText("Ready").waitFor({ timeout: 8000 });
  check("the card becomes Ready after saving", true);

  // failure card
  await page.getByRole("button", { name: "Mark order 1005 ready" }).click();
  await page.getByRole("alert").filter({ hasText: "printer is jammed" }).waitFor({ timeout: 8000 });
  check("a failed Mark ready shows an alert on its card", true);
  await page.screenshot({ path: "board.png" });
} finally {
  await browser.close();
  server.kill();
}
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `\nAll ${results.length} browser checks passed.` : `\n${failed} of ${results.length} FAILED.`);
process.exit(failed === 0 ? 0 : 1);
```

### Design decisions

| Decision | Reason |
|---|---|
| The page imports everything from `components/index.js` | One place to see the whole set, and no raw `<button>` or `<dialog>` in the page. |
| `Button` is `type="button"` by default | Inside a form, a plain `<button>` submits it. Safer to be explicit. |
| `Button` loading = disabled + `aria-busy` + spinner + same label | The button cannot be pressed twice, screen readers know why, and the size does not jump. |
| `Button` ignores clicks when loading or disabled | A second guard besides the `disabled` attribute. |
| Every button is at least 44px tall | A comfortable touch target. |
| `Input` uses `useId` for its label link | Two inputs on a page never share an id. |
| `Input` puts hint and error in `aria-describedby`; the error is a `role="alert"` | Screen readers read the hint, then the error, and announce a new error. |
| `Card` is built from parts (`CardHeader`, `CardBody`, `CardFooter`) | The page decides what goes in each part. The card only decides the spacing. |
| `Card` can be another element (`as`) | An order is an `article`, but the same card can be a `section`. |
| `Stack` takes `gap` in steps of 4px | Spacing comes from one scale, never from a typed number. |
| `PageLayout` renders the skip link first and one `<main>` | Keyboard users skip the header in one key press. Pages have one main landmark. |
| `<main tabIndex={-1}>` | A link jump scrolls on its own, but focus stays behind unless main can take focus. |
| No empty `<header>` when there is no header | An empty landmark is noise for screen readers. |
| `Modal` wraps the native `<dialog>` with `showModal()` | Focus, inert background, Escape and focus return come from the browser, not from code that can go wrong. |
| Escape calls `onClose` after `preventDefault()` | The page, not the browser, decides whether it closes. |
| `dismissible={false}` while cancelling | Escape or an outside click must not hide a request that is still running. |
| A click on the dark area closes it, a click on the content does not | The dark area is the `<dialog>` element itself, so `e.target` tells them apart. |
| `Modal` listens to the browser's own `close` event | If the browser closes it, our state stays in step. |
| `Modal` has `aria-labelledby` pointing at its title | The dialog's name is its title. |
| Each `OrderCard` calls `useMarkReady()` | Each card gets its own loading and error state. |
| `Mark ready` is hidden once an order is ready | There is nothing left to do, and a button that cannot work is clutter. |
| `Cancel` is disabled while that card is being marked ready | Two changes to one order at once is a recipe for a confusing result. |
| A failed Mark ready shows an alert on that card and the button works again | The problem appears where the person was looking, and they can try again. |
| Both mutations call `invalidateQueries(["orders"])` on success | The list is the single source of truth, so it is loaded again instead of patched by hand. |
| The mutation stays pending until the reload finishes | The spinner does not stop before the card has changed. |
| Search is worked out from the loaded list | No second list to keep in step, no extra request, and the text survives a reload. |
| Table search matches the whole number | `table 1` must not find table 13. |
| The count line (`Showing 3 of 5 open orders`) is a live `status` | Screen readers hear how many results the search left. |
| The dialog's error is cleared when it closes | Reopening it must not show a message from the last try. |
| The fake server keeps one order (1005) that always fails | A failure can be seen in the browser, not just in a test. |
| Escape is simulated in jsdom, and the real thing is checked in Chromium | jsdom has no `<dialog>.showModal()`, so the stand-in is small and the real behavior has its own check. |

---

## 7. Tests (62 tests)

Components are tested alone first, then the whole board is tested like a person uses it. The fake server (MSW) answers the real `fetch` calls, can be held back to look at loading states, and can be made to fail. A held answer falls through to the normal handler, so the order really changes afterwards. **jsdom has no `<dialog>.showModal()`**, so `src/test/setup.js` adds a small stand-in (open, close, the `close` event). Escape is simulated with a `cancel` event. The real dialog, focus and skip link are checked in Chromium (below). Any `console.error` fails a test.

| # | Test | What it proves |
|---|---|---|
| 1 to 8 | `Button`: type default and submit; calls onClick; variants; loading (disabled, `aria-busy`, label kept, ignores clicks); not loading has no `aria-busy`; disabled ignores clicks; extra attributes | Button |
| 9 to 14 | `Input`: label link; unique ids; hint as description; error (alert, `aria-invalid`, hint plus error); no error state; value and onChange | Input |
| 15 to 16 | `Card`: parts in order; another element | Card |
| 17 to 19 | `Stack`: defaults; direction, gap, align, justify; wrap only when asked | Stack |
| 20 to 23 | `PageLayout`: skip link is the first Tab stop and points at main; one main with the right id and `tabindex`; header before main; no empty banner | Page frame |
| 24 to 30 | `Modal`: open and close by prop; labelled by its title; Escape asks and is intercepted; outside click vs inside click; `dismissible=false`; program close does not call `onClose`; a browser close does | Dialog |
| 31 to 39 | `filterOrders`: empty gives the same list; dish (case, partial); table (exact); a whole table number; "table 7"; order number with or without #; trimmed; no match; frozen input | Search rules |
| 40 to 45 | Board loading: loading text then cards; 5 cards; card contents; failed load and Try again; empty list; one skip link, one main, one h1 | Loading |
| 46 to 49 | Search: filters and counts; table number; no match message and clearing; no new request | Search |
| 50 to 54 | Mark ready: loading on that card only; list reloads and the card shows Ready with no buttons; double click sends one request; failure alert on that card and button usable again; search text kept after reload | Mark ready |
| 55 to 62 | Cancel: opens about that order, nothing sent; closed until pressed; Keep order; Escape; Confirm shows loading, cannot be dismissed, then the order leaves; exactly one request for the right order; failure keeps the dialog open with the reason; the message is gone on reopening | Confirmation dialog |

### `src/test/setup.js`

```js
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";

// React reports mistakes (a missing key, a bad update) with console.error.
// Any console.error fails the test, so mistakes cannot hide in the output.
let errorSpy;
beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  const calls = errorSpy.mock.calls.map((c) => c.join(" "));
  errorSpy.mockRestore();
  expect(calls, "console.error was called during the test").toEqual([]);
});

// jsdom does not implement <dialog>.showModal() and .close(), so a small stand-in is added here.
// It copies what the browser does that matters to these tests: set `open`, fire `close`, and let
// Escape fire a cancelable `cancel` first. The real browser behavior is checked in Chromium (see the layout check).
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
import { afterAll, beforeAll } from "vitest";
import { server, resetOrders } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetOrders();
});
afterAll(() => server.close());
```

### `src/test/server.js`

```js
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
```

### `src/components/components.test.jsx`

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, Card, CardBody, CardFooter, CardHeader, Input, Modal, PageLayout, Stack } from ".";

describe("Button", () => {
  it("is type=button by default (so it never submits a form by accident)", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });
  it("can be a submit button", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("uses a class per variant", () => {
    const { rerender } = render(<Button variant="danger">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn--danger");
    rerender(<Button variant="secondary">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn--secondary");
  });
  it("loading: disabled, aria-busy, keeps its label, and ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("not loading: no aria-busy", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });
  it("disabled ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
  it("passes other attributes through (aria-label)", () => {
    render(<Button aria-label="Cancel order 5">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel order 5" })).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("connects the label to the input", () => {
    render(<Input label="Search" />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });
  it("two inputs get different ids", () => {
    render(<><Input label="A" /><Input label="B" /></>);
    expect(screen.getByLabelText("A").id).not.toBe(screen.getByLabelText("B").id);
  });
  it("hint is the description", () => {
    render(<Input label="Search" hint="By table." />);
    expect(screen.getByLabelText("Search")).toHaveAccessibleDescription("By table.");
  });
  it("error: alert, aria-invalid, and part of the description with the hint", () => {
    render(<Input label="Search" hint="By table." error="Too short." />);
    const input = screen.getByLabelText("Search");
    expect(screen.getByRole("alert")).toHaveTextContent("Too short.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("By table. Too short.");
  });
  it("no error: no aria-invalid and no alert", () => {
    render(<Input label="Search" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search")).not.toHaveAttribute("aria-invalid");
  });
  it("passes value and onChange through", async () => {
    const onChange = vi.fn();
    render(<Input label="Search" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Search"), "a");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Card", () => {
  it("puts its parts together in order", () => {
    render(<Card aria-label="Order"><CardHeader>Head</CardHeader><CardBody>Body</CardBody><CardFooter>Foot</CardFooter></Card>);
    const card = screen.getByRole("article", { name: "Order" });
    expect(card.textContent).toBe("HeadBodyFoot");
  });
  it("can be a different element", () => {
    render(<Card as="section" aria-label="S">x</Card>);
    expect(screen.getByRole("region", { name: "S" })).toBeInTheDocument();
  });
});

describe("Stack", () => {
  it("is a column with a gap by default", () => {
    const { container } = render(<Stack>x</Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: "column", gap: "calc(var(--space) * 2)" });
  });
  it("takes direction, gap, align and justify", () => {
    const { container } = render(<Stack direction="row" gap={4} align="center" justify="space-between">x</Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: "row", gap: "calc(var(--space) * 4)", alignItems: "center", justifyContent: "space-between" });
  });
  it("wraps only when asked", () => {
    const { container, rerender } = render(<Stack>x</Stack>);
    expect(container.firstChild.style.flexWrap).toBe("");
    rerender(<Stack wrap>x</Stack>);
    expect(container.firstChild).toHaveStyle({ flexWrap: "wrap" });
  });
});

describe("PageLayout", () => {
  it("has the skip link as the FIRST thing to tab to, pointing at main", async () => {
    render(<PageLayout header={<button>Menu</button>}>content</PageLayout>);
    await userEvent.tab();
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveFocus();
    expect(link).toHaveAttribute("href", "#main");
  });
  it("has exactly one main landmark, and the link target exists", () => {
    render(<PageLayout>content</PageLayout>);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1"); // so the jump can move focus to it
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
  it("puts the header before main and shows content inside main", () => {
    render(<PageLayout header={<h1>Title</h1>}>content</PageLayout>);
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(main).toHaveTextContent("content");
  });
  it("without a header there is no empty banner", () => {
    render(<PageLayout>content</PageLayout>);
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});

describe("Modal", () => {
  const dialog = () => document.querySelector("dialog");
  it("is closed when open is false, and open when true", () => {
    const { rerender } = render(<Modal open={false} onClose={() => {}} title="Sure?">x</Modal>);
    expect(dialog()).not.toHaveAttribute("open");
    rerender(<Modal open onClose={() => {}} title="Sure?">x</Modal>);
    expect(dialog()).toHaveAttribute("open");
    rerender(<Modal open={false} onClose={() => {}} title="Sure?">x</Modal>);
    expect(dialog()).not.toHaveAttribute("open");
  });
  it("is a labelled dialog (the title is its name)", () => {
    render(<Modal open onClose={() => {}} title="Cancel this order?">x</Modal>);
    expect(screen.getByRole("dialog", { name: "Cancel this order?" })).toBeInTheDocument();
  });
  it("Escape (the cancel event) asks to close instead of closing by itself", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Sure?">x</Modal>);
    const event = new Event("cancel", { cancelable: true });
    dialog().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("a click on the dark area closes; a click on the content does not", async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Sure?"><button>Inside</button></Modal>);
    await userEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(dialog());
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("dismissible=false ignores Escape and outside clicks", async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Sure?" dismissible={false}>x</Modal>);
    dialog().dispatchEvent(new Event("cancel", { cancelable: true }));
    await userEvent.click(dialog());
    expect(onClose).not.toHaveBeenCalled();
  });
  it("closing it from the program does not call onClose again", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open onClose={onClose} title="Sure?">x</Modal>);
    rerender(<Modal open={false} onClose={onClose} title="Sure?">x</Modal>);
    expect(onClose).not.toHaveBeenCalled();
  });
  it("when the browser closes it on its own, onClose keeps our state in step", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Sure?">x</Modal>);
    dialog().close();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

### `src/orders.test.js`

```js
import { describe, expect, it } from "vitest";
import { filterOrders } from "./orders";

const orders = [
  { id: 1001, table: 4, status: "preparing", items: [{ name: "Idli", qty: 2 }, { name: "Filter Coffee", qty: 2 }] },
  { id: 1002, table: 7, status: "preparing", items: [{ name: "Masala Dosa", qty: 1 }] },
  { id: 1013, table: 13, status: "ready", items: [{ name: "Idli", qty: 1 }] },
];
const ids = (list) => list.map((o) => o.id);

describe("filterOrders", () => {
  it("empty or spaces gives everything (the same list)", () => {
    expect(filterOrders(orders, "")).toBe(orders);
    expect(filterOrders(orders, "   ")).toBe(orders);
  });
  it("matches a dish name, any case, part of a word", () => {
    expect(ids(filterOrders(orders, "idli"))).toEqual([1001, 1013]);
    expect(ids(filterOrders(orders, "DOS"))).toEqual([1002]);
    expect(ids(filterOrders(orders, "coffee"))).toEqual([1001]);
  });
  it("matches a table number exactly (4 is not 14)", () => {
    expect(ids(filterOrders(orders, "4"))).toEqual([1001]);
    expect(ids(filterOrders(orders, "13"))).toContain(1013);
  });
  it("a table number must match the whole number (table 1 is not table 13)", () => {
    expect(filterOrders(orders, "table 1")).toEqual([]);
    expect(ids(filterOrders(orders, "table 13"))).toEqual([1013]);
  });
  it("understands \"table 7\"", () => {
    expect(ids(filterOrders(orders, "table 7"))).toEqual([1002]);
  });
  it("matches an order number, with or without #", () => {
    expect(ids(filterOrders(orders, "1002"))).toEqual([1002]);
    expect(ids(filterOrders(orders, "#1002"))).toEqual([1002]);
  });
  it("trims the search text", () => {
    expect(ids(filterOrders(orders, "  idli  "))).toEqual([1001, 1013]);
  });
  it("no match gives an empty list", () => {
    expect(filterOrders(orders, "pizza")).toEqual([]);
  });
  it("keeps the order and does not change the input", () => {
    const frozen = Object.freeze(orders.map((o) => Object.freeze(o)));
    expect(() => filterOrders(frozen, "idli")).not.toThrow();
  });
});
```

### `src/App.test.jsx`

```jsx
import { QueryClient } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import App from "./App";
import { gate, requests, server } from "./test/server";

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { user: userEvent.setup(), ...render(<App client={client} />) };
};
const card = (id) => screen.getByRole("article", { name: new RegExp(`Table ${id}$`) });
const board = async () => {
  const ctx = setup();
  await screen.findByRole("article", { name: /Table 4/ });
  return ctx;
};

describe("loading the board", () => {
  it("shows a loading message, then one card per open order", async () => {
    const hold = gate();
    server.use(http.get("/api/orders", async () => (await hold.promise, HttpResponse.json([{ id: 1, table: 3, status: "preparing", items: [{ name: "Idli", qty: 1 }] }]))));
    setup();
    expect(screen.getByRole("status")).toHaveTextContent("Loading orders");
    hold.open();
    expect(await screen.findByRole("article", { name: /Table 3/ })).toBeInTheDocument();
  });
  it("shows all 5 starting orders as cards", async () => {
    await board();
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getByText("Showing 5 of 5 open orders")).toBeInTheDocument();
  });
  it("shows the table, number, items and status on a card", async () => {
    await board();
    const c = within(card(4));
    expect(c.getByText("Order #1001")).toBeInTheDocument();
    expect(c.getByText("2 × Idli")).toBeInTheDocument();
    expect(c.getByText("2 × Filter Coffee")).toBeInTheDocument();
    expect(c.getByText("Preparing")).toBeInTheDocument();
  });
  it("a failed load shows the message and Try again recovers", async () => {
    let fail = true;
    server.use(http.get("/api/orders", () => (fail ? HttpResponse.json({ detail: "The kitchen is closed." }, { status: 500 }) : HttpResponse.json([]))));
    const { user } = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("The kitchen is closed.");
    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No open orders.")).toBeInTheDocument();
  });
  it("says so when there are no open orders", async () => {
    server.use(http.get("/api/orders", () => HttpResponse.json([])));
    setup();
    expect(await screen.findByText("No open orders.")).toBeInTheDocument();
  });
  it("uses one skip link, one main and one h1", async () => {
    await board();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("search", () => {
  it("filters as you type, and says how many are shown", async () => {
    const { user } = await board();
    await user.type(screen.getByLabelText("Search orders"), "dosa");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Showing 1 of 5 open orders")).toBeInTheDocument();
  });
  it("matches a table number", async () => {
    const { user } = await board();
    await user.type(screen.getByLabelText("Search orders"), "table 7");
    expect(screen.getByRole("article", { name: /Table 7/ })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
  it("says so when nothing matches, and clearing brings everything back", async () => {
    const { user } = await board();
    await user.type(screen.getByLabelText("Search orders"), "pizza");
    expect(screen.getByText("No orders match “pizza”.")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    await user.clear(screen.getByLabelText("Search orders"));
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });
  it("makes no new request (the filter is worked out from the list)", async () => {
    const { user } = await board();
    const before = requests.length;
    await user.type(screen.getByLabelText("Search orders"), "idli");
    expect(requests.length).toBe(before);
  });
});

describe("Mark ready", () => {
  it("shows loading on THAT card only, then the card becomes Ready with no buttons", async () => {
    const hold = gate();
    // Hold the answer back, then fall through to the normal handler (a resolver that returns nothing does that).
    server.use(http.post("/api/orders/1001/ready", async () => { await hold.promise; }));
    const { user } = await board();
    await user.click(within(card(4)).getByRole("button", { name: "Mark order 1001 ready" }));

    const busy = within(card(4)).getByRole("button", { name: "Mark order 1001 ready" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveTextContent("Marking...");
    expect(within(card(4)).getByRole("button", { name: "Cancel order 1001" })).toBeDisabled();
    // another card is untouched
    expect(within(card(7)).getByRole("button", { name: "Mark order 1002 ready" })).toBeEnabled();
    hold.open();
    await waitFor(() => expect(within(card(4)).getByText("Ready")).toBeInTheDocument());
  });
  it("on success the list loads again (the orders are marked out of date) and the card shows Ready", async () => {
    const { user } = await board();
    const loadsBefore = requests.filter((r) => r === "GET /api/orders").length;
    await user.click(within(card(4)).getByRole("button", { name: "Mark order 1001 ready" }));
    await waitFor(() => expect(within(card(4)).getByText("Ready")).toBeInTheDocument());
    expect(requests.filter((r) => r === "GET /api/orders").length).toBe(loadsBefore + 1);
    expect(within(card(4)).queryByRole("button")).not.toBeInTheDocument();
  });
  it("a double click sends one request", async () => {
    const { user } = await board();
    const button = within(card(4)).getByRole("button", { name: "Mark order 1001 ready" });
    await user.dblClick(button);
    await waitFor(() => expect(within(card(4)).getByText("Ready")).toBeInTheDocument());
    expect(requests.filter((r) => r === "POST /api/orders/1001/ready")).toHaveLength(1);
  });
  it("a failure shows an alert on that card, and the button works again", async () => {
    const { user } = await board();
    await user.click(within(card(13)).getByRole("button", { name: "Mark order 1005 ready" }));
    expect(await within(card(13)).findByRole("alert")).toHaveTextContent("Could not mark order #1005 ready: The ticket printer is jammed.");
    expect(within(card(13)).getByRole("button", { name: "Mark order 1005 ready" })).toBeEnabled();
    expect(within(card(4)).queryByRole("alert")).not.toBeInTheDocument();
  });
  it("keeps the search text after the list reloads", async () => {
    const { user } = await board();
    await user.type(screen.getByLabelText("Search orders"), "idli");
    await user.click(within(card(4)).getByRole("button", { name: "Mark order 1001 ready" }));
    await waitFor(() => expect(within(card(4)).getByText("Ready")).toBeInTheDocument());
    expect(screen.getByLabelText("Search orders")).toHaveValue("idli");
  });
});

describe("Cancel with a confirmation dialog", () => {
  const dialog = () => screen.getByRole("dialog", { name: "Cancel this order?", hidden: true });
  const open = async (user, id = 1001, table = 4) => {
    await user.click(within(card(table)).getByRole("button", { name: `Cancel order ${id}` }));
  };

  it("opens a dialog about THAT order, and nothing is sent yet", async () => {
    const { user } = await board();
    await open(user);
    expect(dialog()).toHaveAttribute("open");
    expect(within(dialog()).getByText(/Table 4, order #1001/)).toBeInTheDocument();
    expect(requests.some((r) => r.includes("/cancel"))).toBe(false);
  });
  it("is closed until you press Cancel", async () => {
    await board();
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });
  it("Keep order closes it and the order stays", async () => {
    const { user } = await board();
    await open(user);
    await user.click(within(dialog()).getByRole("button", { name: "Keep order" }));
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(card(4)).toBeInTheDocument();
    expect(requests.some((r) => r.includes("/cancel"))).toBe(false);
  });
  it("Escape closes it", async () => {
    const { user } = await board();
    await open(user);
    document.querySelector("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(document.querySelector("dialog")).not.toHaveAttribute("open"));
    expect(card(4)).toBeInTheDocument();
  });
  it("Confirm shows loading, cannot be dismissed meanwhile, then the order leaves the board", async () => {
    const hold = gate();
    server.use(http.post("/api/orders/1001/cancel", async () => { await hold.promise; }));
    const { user } = await board();
    await open(user);
    await user.click(within(dialog()).getByRole("button", { name: "Cancel order" }));
    const busy = within(dialog()).getByRole("button", { name: "Cancelling..." });
    expect(busy).toBeDisabled();
    expect(within(dialog()).getByRole("button", { name: "Keep order" })).toBeDisabled();
    // Escape is ignored while saving
    await act(async () => {
      document.querySelector("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(document.querySelector("dialog")).toHaveAttribute("open");
    hold.open();
    await waitFor(() => expect(screen.queryByRole("article", { name: /Table 4$/ })).not.toBeInTheDocument());
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(screen.getByText("Showing 4 of 4 open orders")).toBeInTheDocument();
  });
  it("sends exactly one cancel request, for the right order", async () => {
    const { user } = await board();
    await open(user, 1002, 7);
    await user.click(within(dialog()).getByRole("button", { name: "Cancel order" }));
    await waitFor(() => expect(screen.queryByRole("article", { name: /Table 7$/ })).not.toBeInTheDocument());
    expect(requests.filter((r) => r.includes("/cancel"))).toEqual(["POST /api/orders/1002/cancel"]);
  });
  it("a failure keeps the dialog open and shows the reason", async () => {
    server.use(http.post("/api/orders/1001/cancel", () => HttpResponse.json({ detail: "Order 1001 is already ready and cannot be cancelled." }, { status: 409 })));
    const { user } = await board();
    await open(user);
    await user.click(within(dialog()).getByRole("button", { name: "Cancel order" }));
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent("already ready");
    expect(document.querySelector("dialog")).toHaveAttribute("open");
    expect(within(dialog()).getByRole("button", { name: "Cancel order" })).toBeEnabled();
  });
  it("the failure message is gone when the dialog is opened again", async () => {
    server.use(http.post("/api/orders/1001/cancel", () => HttpResponse.json({ detail: "Nope." }, { status: 409 })));
    const { user } = await board();
    await open(user);
    await user.click(within(dialog()).getByRole("button", { name: "Cancel order" }));
    await within(dialog()).findByRole("alert");
    await user.click(within(dialog()).getByRole("button", { name: "Keep order" }));
    await open(user);
    expect(within(dialog()).queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

---

## 8. Results

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | **62 passed** (3 files) |
| Build | `npm run build` | Built successfully |
| Real-browser check | `node scripts/check-browser.mjs` (Chromium, the real dev server and fake API) | **16 of 16 passed**: first Tab is the skip link and Enter moves focus to `<main>`; every button is at least 44px tall; search narrows the cards; the dialog is a real modal (`:modal`); focus moves into it; 8 Tab presses never reach the page behind it; Escape closes it; focus returns to the Cancel button that opened it; clicking the dark area closes it; Escape is ignored while the cancel is saving; after saving the order is gone; Mark ready shows a spinner and is disabled while saving; another card's button stays enabled; the card becomes Ready; a failed Mark ready shows an alert on its card |
| Break-it checks | 19 changes, such as: a loading button not disabled; no `aria-busy`; default type submit; error not linked; Modal ignoring `dismissible` (Escape, outside click, and while saving); Escape not intercepted; main not focusable; an empty header always drawn; Stack ignoring gap; no reload after a change; partial table match; Cancel enabled while saving; dialog not closing after success; old error kept on reopening; no loading state on Mark ready; a ready card still showing Mark ready; no "no match" message | **All caught** (1 to 6 tests failed each). Two survived at first (dismissing while saving; a ready card keeping its button) because the test checked too early or the change was not applied; both were fixed and now fail |
| Restored original | `npm test` | **62 passed** |

---

## 9. Problems avoided

| Problem | Cause | Fix |
|---|---|---|
| jsdom has no `<dialog>.showModal()` | jsdom does not implement the dialog methods | A small stand-in in the test setup, plus a real-browser check for the parts that matter (focus, inert page, Escape) |
| A held-back mutation never really changed the order | The test's replacement handler answered with a fake body, so the server's data did not change and the reload brought the order back | The held handler waits and then returns nothing, which makes MSW use the normal handler |
| A test that said Escape was ignored while saving, but did not fail when it was not | The assertion ran before React had re-rendered, so it saw the old state | The Escape event is fired inside `act`, and the break-it check now fails |
| A first browser check said the Tab key left the dialog | At the last button, Tab hands focus to the browser's own toolbar, so the page's active element becomes `BODY` | The check now says what really matters: focus never lands on the page behind the dialog (`BODY` is allowed) |
| A stale dev server made a rerun fail | The first run's server was still using the port and had already cancelled order 1001 | The script starts Vite directly, so stopping it really stops it |
| `table 1` could match table 13 | A partial match on the table number | Table numbers are matched whole, and a test pins it |
| A stuck spinner risk | The button could stop being busy before the list reloaded | The mutation returns the reload, so it stays pending until the card has changed |

---

## 10. What was practiced

- Building small components that carry their own accessibility, so pages cannot forget it.
- Composing a card from parts, and spacing with one scale (`Stack`).
- Using the native `<dialog>` instead of rebuilding focus handling.
- Giving each button its own loading state with a mutation per card.
- Marking a list as out of date after a change (`invalidateQueries`).
- Confirming a destructive action, and showing the server's reason if it refuses.
- Adding a skip link and a focusable `<main>`.
- Testing what jsdom cannot (a real dialog) in a real browser, and breaking the code on purpose to check the tests.

---

## 11. Known limit

The orders come from a fake server (`vite.config.js` for the browser, MSW for tests), not a real backend. Order 1005 always fails to be marked ready so the error can be seen, and the fake server forgets everything when restarted. The styling is plain CSS with a handful of colour variables (the next day's task is to theme it properly). The Day 27 task text was not visible beyond its data-fetching exercises, so the data layer here (a query, two mutations that mark the list out of date) is a small version of the TanStack Query ideas, not a copy of any Day 27 file. The browser check needs Playwright, which is not in `package.json`; `npm test` does not need it.

---

## 12. How to run it

```bash
cd kitchen-order-board
npm install
npm test        # 62 tests
npm run dev     # open the link
```

In the page: type `dosa` or `table 7` in the search box. Press Mark ready on an order (a spinner shows for about a second, then it says Ready). Press Cancel to open the confirmation, then Escape, Keep order, or Cancel order. Order 1005 (table 13) always fails to be marked ready, to show the error. Open `/?fail=1` to see the first load fail with a Try again button. Press Tab once on a fresh page to see the skip link.
