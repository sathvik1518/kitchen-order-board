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
