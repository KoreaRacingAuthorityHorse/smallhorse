import assert from "node:assert/strict";

const port = Number(process.env.TRACKON_CDP_PORT ?? 9227);
const base = "http://127.0.0.1:3107";
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
async function run(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
const wait = (ms = 110) => new Promise((resolve) => setTimeout(resolve, ms));
async function visit(path) { await send("Page.navigate", { url: base + path }); await wait(1500); }
async function reload() { await send("Page.reload", { ignoreCache: true }); await wait(1500); }
async function click(selector, index = 0) {
  const found = await run(`(() => { const item = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!item) return false; item.click(); return true; })()`);
  assert.equal(found, true, `Missing ${selector}[${index}]`);
  await wait();
}
async function clickText(selector, label) {
  const found = await run(`(() => { const item = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.trim().startsWith(${JSON.stringify(label)})); if (!item) return false; item.click(); return true; })()`);
  assert.equal(found, true, `Missing ${label} in ${selector}`);
  await wait();
}
async function input(selector, value) {
  const found = await run(`(() => { const item = document.querySelector(${JSON.stringify(selector)}); if (!item) return false; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(item, ${JSON.stringify(value)}); item.dispatchEvent(new Event('input', { bubbles: true })); item.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  assert.equal(found, true, `Missing input ${selector}`);
  await wait();
}
async function chooseType(label) {
  const found = await run(`(() => { const item = [...document.querySelectorAll('.bet-type-card')].find((node) => node.querySelector('strong')?.textContent === ${JSON.stringify(label)}); if (!item) return false; item.click(); return true; })()`);
  assert.equal(found, true, `Missing bet type ${label}`);
  await wait();
}
async function horse(number, group = null) {
  const selector = group === null ? `.bet-table-select` : `.bet-group:nth-of-type(${group + 1}) .bet-horse-choices`;
  const found = await run(`(() => { if (${group === null}) { const row = document.querySelectorAll('.bet-table tbody tr')[${number - 1}]; const buttons = row?.querySelectorAll('.bet-table-select'); const rank = document.querySelectorAll('.bet-table-select.active').length; const item = buttons?.[Math.min(rank, buttons.length - 1)]; if (!item) return false; item.click(); return true; } const lists = document.querySelectorAll('.bet-group .bet-horse-choices'); const list = lists[${group ?? 0}]; const item = list?.querySelectorAll('button')[${number - 1}]; if (!item) return false; item.click(); return true; })()`);
  assert.equal(found, true, `Missing horse ${number} in ${selector}`);
  await wait();
}
const cartCount = () => run("document.querySelectorAll('.bet-slip-rows label').length");
const store = () => run("JSON.parse(localStorage.getItem('trackon-premium-demo-v1') || 'null')");
const chip = () => run("document.querySelector('.points-chip')?.textContent.replace(/\\s/g, '')");

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await visit("/races/u1");
await run("localStorage.removeItem('trackon-premium-demo-v1')");
await reload();

const statuses = [
  ["/races/u1", "구매 가능", 12, false],
  ["/races/u3", "마감", 10, true],
  ["/races/u6", "취소", 9, true],
  ["/races/p1", "종료", 12, true],
  ["/races/u4", "구매 가능", 11, false],
];
for (const [path, label, horses, blocked] of statuses) {
  await visit(path);
  const state = await run("({ status: document.querySelector('.bet-status')?.textContent, horses: document.querySelectorAll('.bet-table tbody tr').length, blocked: document.querySelector('.bet-table-select')?.disabled, checkoutBlocked: document.querySelector('.bet-checkout')?.disabled })");
  assert.equal(state.status, label, path);
  assert.equal(state.horses, horses, path);
  assert.equal(state.blocked, blocked, path);
  assert.equal(state.checkoutBlocked, true, path);
}
console.log("PASS race IDs, counts, statuses and disabled purchases");

await visit("/races/u1");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 7);
await clickText('.bet-mode-switch[aria-label="승식 안내 모드"] button', "초보자 모드");
assert.match(await run("document.querySelector('.bet-beginner-guide').textContent"), /몇 마리의 말을 맞혀볼까요/);
await clickText('.bet-answer-row button', "1마리");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 2);
await clickText('.bet-answer-row button', "3등 안에 들 것 같아요");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 1);
assert.match(await run("document.querySelector('.bet-beginner-guide').textContent"), /7마리 이하 출전/);
await clickText('.bet-answer-row button', "2마리");
await clickText('.bet-answer-row button', "순서 무관");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 2);
await clickText('.bet-answer-row button', "두 마리 모두 3등 안에 들 거예요");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 1);
assert.match(await run("document.querySelector('.bet-type-card').textContent"), /복연승/);
await clickText('.bet-answer-row button', "순서까지 정확히");
assert.match(await run("document.querySelector('.bet-type-card').textContent"), /쌍승/);
await clickText('.bet-answer-row button', "3마리");
await clickText('.bet-answer-row button', "순서 무관");
assert.match(await run("document.querySelector('.bet-type-card').textContent"), /삼복승/);
await clickText('.bet-answer-row button', "순서까지 정확히");
assert.match(await run("document.querySelector('.bet-type-card').textContent"), /삼쌍승/);
await clickText('.bet-mode-switch[aria-label="승식 안내 모드"] button', "일반 모드");
assert.equal(await run("document.querySelectorAll('.bet-type-card').length"), 7);
await click('.bet-text-button');
assert.equal(await run("document.querySelectorAll('.bet-compare-list button').length"), 7);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
await wait();
assert.equal(await run("document.querySelector('.bet-dialog').open"), false);

for (const [label, count] of [["단승", 1], ["연승", 1], ["복승", 2], ["쌍승", 2], ["복연승", 2], ["삼복승", 3], ["삼쌍승", 3]]) {
  await chooseType(label);
  for (let number = 1; number <= count; number++) await horse(number);
  assert.equal(await run("document.querySelector('.bet-action-row button').disabled"), false, label);
  await click('.bet-action-row button');
  assert.equal(await cartCount(), 1, label);
  await click('.bet-slip-head button');
  assert.equal(await cartCount(), 0, label);
}
await chooseType("쌍승");
await horse(2); await horse(1);
assert.match(await run("document.querySelector('.bet-selection').textContent"), /1착 2번.*2착 1번/);
await click('.bet-action-row button');
assert.equal(await run("document.querySelector('.bet-slip-rows label span').textContent"), "2-1");
await click('.bet-slip-head button');
console.log("PASS seven bet types, beginner/general, rank order, comparison modal");

await chooseType("복승");
await clickText('.bet-mode-switch[aria-label="구매 방식"] button', "조합 구매");
assert.equal(await run("document.querySelectorAll('.bet-group').length"), 2);
await horse(1, 0); await horse(2, 1); await horse(3, 1);
assert.equal(await run("document.querySelectorAll('.bet-group')[1].querySelectorAll('button')[0].disabled"), true);
assert.match(await run("document.querySelector('.bet-preview strong').textContent"), /2개/);
await click('.bet-action-row button');
assert.equal(await cartCount(), 2);
await click('.bet-slip-head button');
assert.equal(await cartCount(), 0);
await chooseType("삼복승");
await clickText('.bet-group-count button', "2라인");
await horse(1, 0); await horse(2, 1); await horse(3, 1); await horse(4, 1);
assert.match(await run("document.querySelector('.bet-preview strong').textContent"), /3개/);
await click('.bet-action-row button');
assert.equal(await cartCount(), 3);
await click('.bet-slip-head button');
console.log("PASS line groups, combination previews, slip add/remove");

await clickText('.bet-mode-switch[aria-label="구매 방식"] button', "개별 구매");
await chooseType("단승");
assert.equal(await run("document.querySelectorAll('.bet-table-select')[11].disabled"), true);
await horse(1);
await click('.bet-action-row button');
await horse(1);
await click('.bet-action-row button');
assert.equal(await cartCount(), 1);
assert.match(await run("document.querySelector('.bet-message').textContent"), /이미 베팅 용지/);
await input('.bet-slip-rows input', "150");
assert.match(await run("document.querySelector('.bet-validation')?.textContent || ''"), /100P 단위/);
assert.equal(await run("document.querySelector('.bet-checkout').disabled"), true);
await input('.bet-slip-rows input', "13000");
assert.match(await run("document.querySelector('.bet-validation')?.textContent || ''"), /부족/);
await input('.bet-slip-rows input', "100");
assert.equal(await run("document.querySelector('.bet-checkout').disabled"), false);
await click('.bet-checkout');
assert.match(await run("document.querySelector('.bet-dialog h2').textContent"), /구매할까요/);
await run("(() => { const button = [...document.querySelectorAll('.bet-dialog-actions button')].find((item) => item.textContent.includes('구매 완료')); button.click(); button.click(); })()");
await wait();
let saved = await store();
assert.equal(saved.balance, 12_380);
assert.equal(saved.records.length, 1);
assert.equal(saved.records[0].raceId, "u1");
assert.equal(saved.records[0].amount, -100);
assert.match(await run("document.querySelector('.bet-dialog h2').textContent"), /저장했습니다/);
assert.match(await chip(), /12,380P/);
console.log("PASS duplicate, scratched horse, invalid stake, insufficient points, rapid submit, saved purchase");

await visit("/dashboard");
assert.match(await chip(), /12,380P/);
assert.equal(await run("document.querySelectorAll('.recent-table tbody tr').length"), 1);
assert.match(await run("document.querySelector('.recent-table tbody').textContent"), /부경 01R/);
await reload();
assert.match(await chip(), /12,380P/);
assert.equal(await run("document.querySelectorAll('.recent-table tbody tr').length"), 1);
await visit("/races/u4");
assert.match(await chip(), /12,380P/);
await chooseType("복승");
await clickText('.bet-mode-switch[aria-label="구매 방식"] button', "조합 구매");
await clickText('.bet-group-count button', "2라인");
await horse(1, 0); await horse(2, 1); await horse(3, 1);
await click('.bet-action-row button');
await click('.bet-checkout');
await clickText('.bet-dialog-actions button', "구매 완료");
saved = await store();
assert.equal(saved.balance, 12_180);
assert.equal(saved.records.length, 2);
assert.equal(saved.records[0].raceId, "u4");
assert.equal(saved.records[0].amount, -200);
await visit("/dashboard");
assert.match(await chip(), /12,180P/);
assert.equal(await run("document.querySelectorAll('.recent-table tbody tr').length"), 2);
await run("window.confirm = () => true");
await clickText('.policy-small button', "데모 기록·포인트 초기화");
assert.equal(await store(), null);
assert.match(await chip(), /12,480P/);
assert.match(await run("document.querySelector('.recent-table tbody').textContent"), /저장된 예측 기록이 없습니다/);
await reload();
assert.match(await chip(), /12,480P/);
await visit("/races/u1");
assert.match(await chip(), /12,480P/);
console.log("PASS second race, dashboard, reload, reset and shared balance");

await visit("/");
assert.equal(await run("!!document.querySelector('.hero')"), true);
assert.match(await run("document.querySelector('[data-open-race=\"u1\"]').closest('.race-card').textContent"), /부산경남 제1경주/);
await click('[data-open-race="u1"]');
await wait(1200);
assert.equal(await run("location.pathname"), "/races/u1");
assert.match(await run("document.querySelector('.bet-heading h1').textContent"), /부경 01경주/);
await visit("/");
await click('.nav-actions a[href="/login"]');
await wait(1400);
assert.equal(await run("location.pathname"), "/login");
await click('#demoLogin');
await wait(1400);
assert.equal(await run("location.pathname"), "/dashboard");
assert.equal(await run("sessionStorage.getItem('trackon-demo-login')"), "1");
assert.match(await chip(), /12,480P/);
await click('.dashboard .race-card-actions a');
await wait(1200);
assert.equal(await run("location.pathname"), "/races/u1");
assert.match(await run("document.querySelector('.bet-heading h1').textContent"), /부경 01경주/);
console.log("PASS landing race card → betting detail and landing → login → dashboard → race detail flow");

socket.close();
console.log("ALL BROWSER CHECKS PASSED");
