import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(s,c,n){ if(s.startsWith("@/")) return n(new URL(`../src/${s.slice(2)}.ts`,import.meta.url).href,c); if(s.startsWith("./")&&!s.match(/\.[a-z]+$/i)) return n(new URL(`${s}.ts`,c.parentURL).href,c); return n(s,c); } });
const { settlePurchase, settleAndCreditPurchase } = await import("../src/lib/past-race/settle-purchase.ts");
const reveal = { entries: [1,2,3].map((no,pos)=>({no,pos:pos+1,status:"정상"})), payouts: { 단승:[{combo:"1",odds:2}], 복승:[{combo:"1-2",odds:3}] } };
const purchase=(kind="pastBlind")=>({id:"p1",raceId:"r1",raceKind:kind,mode:"mixed",combinations:[],totalStake:300,confirmedAt:"now",lines:[
 {lineId:"a",slipItemId:"i",groupId:null,mode:"individual",raceId:"r1",raceKind:kind,betType:"WIN",selections:[{horseNo:1}],unitStake:100},
 {lineId:"b",slipItemId:"g",groupId:"g",mode:"combination",raceId:"r1",raceKind:kind,betType:"QUINELLA",selections:[{horseNo:1},{horseNo:2}],unitStake:100},
 {lineId:"c",slipItemId:"g",groupId:"g",mode:"combination",raceId:"r1",raceKind:kind,betType:"WIN",selections:[{horseNo:1}],unitStake:100}]});
test("settles mixed and approved duplicate lines independently with fixed returns",()=>{const out=settlePurchase(purchase(),reveal);assert.equal(out.status,"settled");assert.equal(out.totalReturn,450);assert.equal(out.netChange,150);assert.deepEqual(out.groups[1].lineIds,["b","c"]);assert.equal(out.groups[1].totalReturn,300);});
test("upcoming hit uses 200%, miss 0, and no result is pending",()=>{const out=settlePurchase(purchase("upcoming"),reveal);assert.equal(out.lines[0].reward.returnAmount,200);assert.equal(settlePurchase(purchase(),null).status,"pending");});
test("availability gate blocks partial or incomplete results",()=>{const bad={...reveal,entries:reveal.entries.slice(0,2)};const out=settlePurchase(purchase(),bad);assert.equal(out.status,"unavailable");assert.equal(out.totalReturn,undefined);});
test("missing payout data for any included pool blocks the entire purchase",()=>{const out=settlePurchase(purchase(),{...reveal,payouts:{단승:reveal.payouts.단승}});assert.equal(out.status,"unavailable");});
test("refunds canceled selections and pays confirmed misses zero",()=>{const canceled={...reveal,entries:reveal.entries.map(e=>e.no===1?{...e,status:"출전취소"}:e)};const value=purchase();value.lines[2].selections=[{horseNo:3}];const out=settlePurchase(value,canceled);assert.equal(out.status,"settled");if(out.status==="settled"){assert.equal(out.lines[0].reward.returnAmount,100);assert.equal(out.lines[0].reward.outcome,"refund");assert.equal(out.lines[2].reward.returnAmount,0);}});
test("rejects malformed purchases before settlement",()=>{assert.equal(settlePurchase({...purchase(),totalStake:200},reveal).status,"unavailable");assert.equal(settlePurchase({...purchase(),lines:[]},reveal).status,"unavailable");});
test("credits the wallet only after complete settlement and only once per purchase",()=>{
 const values=new Map([["trackon-premium-demo-v1",JSON.stringify({balance:700,records:[],tasks:[],purchaseLedger:{p1:{debited:true,settled:false}}})]]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const first=settleAndCreditPurchase(purchase(),reveal,"result-1",storage);assert.equal(first.credited,true);assert.equal(first.balance,1150);
 const retry=settleAndCreditPurchase(purchase(),reveal,"result-1",storage);assert.equal(retry.credited,false);assert.equal(retry.balance,1150);
 const pending=settleAndCreditPurchase(purchase(),null,"result-2",storage);assert.equal(pending.credited,false);assert.equal(pending.settlement.status,"pending");
});
