import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.TRACKON_CDP_PORT ?? 9227);
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Chrome page not found");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (!data.id || !pending.has(data.id)) return;
  const { resolve, reject } = pending.get(data.id);
  pending.delete(data.id);
  if (data.error) reject(new Error(data.error.message));
  else resolve(data.result);
});
function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function screenshot(name, fullPage = false) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage, fromSurface: true });
  const path = join(tmpdir(), `trackon-${name}.png`);
  await writeFile(path, Buffer.from(result.data, "base64"));
  return path;
}
async function visit(url) {
  await send("Page.navigate", { url });
  await pause(1800);
}
async function viewport(width, height, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await pause(300);
}
await send("Page.enable");
await send("Runtime.enable");
await viewport(1440, 900);
await visit("http://127.0.0.1:3107/races/u1");
const desktop = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, header: !!document.querySelector('.header'), footer: !!document.querySelector('.footer')})"), image: await screenshot("race-desktop-full", true) };
await evaluate("document.querySelector('.bet-text-button')?.click()");
await pause(250);
const desktopModal = { metrics: await evaluate("({open: document.querySelector('.bet-dialog')?.open, top: document.querySelector('.bet-dialog')?.getBoundingClientRect().top, width: document.querySelector('.bet-dialog')?.getBoundingClientRect().width})"), image: await screenshot("race-desktop-modal") };
await viewport(390, 844, true);
await visit("http://127.0.0.1:3107/races/u1");
const mobile = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, tableWidth: document.querySelector('.bet-table-wrap')?.clientWidth, tableScrollWidth: document.querySelector('.bet-table-wrap')?.scrollWidth, navButton: !!document.querySelector('.mobile-toggle')})"), image: await screenshot("race-mobile-full", true) };
await evaluate("document.querySelector('.mobile-toggle')?.click()");
const mobileNavOpen = await evaluate("document.querySelector('#mainNav')?.classList.contains('open')");
await evaluate("document.querySelector('.mobile-toggle')?.click()");
await evaluate("document.querySelector('.bet-text-button')?.click()");
await pause(250);
const modal = { metrics: await evaluate("({open: document.querySelector('.bet-dialog')?.open, focused: document.activeElement?.getAttribute('aria-label'), width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollY, top: document.querySelector('.bet-dialog')?.getBoundingClientRect().top, height: document.querySelector('.bet-dialog')?.getBoundingClientRect().height, clientHeight: document.querySelector('.bet-dialog')?.clientHeight, contentHeight: document.querySelector('.bet-dialog')?.scrollHeight})"), image: await screenshot("race-mobile-modal") };
await viewport(320, 700, true);
await visit("http://127.0.0.1:3107/races/u1");
const narrowMobile = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, tableWidth: document.querySelector('.bet-table-wrap')?.clientWidth})"), image: await screenshot("race-narrow-mobile") };
await viewport(390, 844, true);
await visit("http://127.0.0.1:3107/dashboard");
const dashboard = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, header: !!document.querySelector('.header'), footer: !!document.querySelector('.footer')})"), image: await screenshot("dashboard-mobile") };
await visit("http://127.0.0.1:3107/login");
const login = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"), image: await screenshot("login-mobile") };
await visit("http://127.0.0.1:3107/");
const landing = { metrics: await evaluate("({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"), image: await screenshot("landing-mobile") };
socket.close();
console.log(JSON.stringify({ desktop, desktopModal, mobile, mobileNavOpen, modal, narrowMobile, dashboard, login, landing }, null, 2));
