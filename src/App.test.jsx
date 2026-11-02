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
