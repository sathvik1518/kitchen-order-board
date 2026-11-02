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
