// Simulates the documented connect contract. This is not a live start.ng test.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext();
await context.route('https://horsebound-endless-derby.start.ng/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/platform.js')return route.fulfill({contentType:'text/javascript',body:await readFile('game/platform.js','utf8')});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Platform contract test</title><body>Platform contract test</body>'});
});
await context.route('https://start.ng/connect',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><script>
window.messages=[];window.fail=false;window.guest=false;
addEventListener('message',e=>{messages.push(e.data);const m=e.data;let r;
if(m.type==='startng:whoami')r={type:'startng:user',user:guest?null:{id:42,name:'Test Rider',account:'test',style:{body:'female',primaryColor:'#a55eea',secondaryColor:'#0c6e5a',skinColor:'#8d5524',hairColor:'#17120f',hair:'braids',hat:'crown',accessory:'earrings'}},guest:{name:'Guest',style:{primaryColor:'#123456'}}};
if(m.type==='startng:score')r={type:'startng:scoreSaved',ok:!fail,...(fail?{error:'Test refusal'}:{result:{improved:true,rank:2}})};
if(m.type==='startng:leaderboard')r={type:'startng:leaderboardData',ok:true,entries:[{rank:1,player_id:42,name:'Test Rider',stats:{distance:100,coins:3}}]};
if(r)e.source.postMessage({...r,requestId:m.requestId},e.origin);
});</script>`}));
const page=await context.newPage();await page.goto('https://horsebound-endless-derby.start.ng/');
const who=await page.evaluate(async()=>{window.platform=await import('./platform.js');return platform.refreshPlayer();});
assert.equal(who.user.id,42);assert.equal(who.player.style.hair,'braids');
const result=await page.evaluate(()=>platform.saveRun({distance:123.9,coins:3,hurdles:2,perfect:1,score:500}));assert(result.ok);assert.equal(result.result.rank,2);
const frame=page.frames().find(f=>f.url()==='https://start.ng/connect');
const sent=await frame.evaluate(()=>messages.find(m=>m.type==='startng:score'));
assert.deepEqual(sent.stats,{distance:123,coins:3,hurdles:2,perfect:1,score:500});assert(sent.requestId);
const board=await page.evaluate(()=>platform.leaderboard());assert.equal(board.entries[0].player_id,42);
await frame.evaluate(()=>{fail=true;});const refused=await page.evaluate(()=>platform.saveRun({distance:1,coins:0,hurdles:0,perfect:0,score:1}));assert.equal(refused.error,'Test refusal');
await frame.evaluate(()=>{guest=true;});const guest=await page.evaluate(()=>platform.refreshPlayer());assert.equal(guest.user,null);assert.equal(guest.player.style.primaryColor,'#123456');
const before=await frame.evaluate(()=>messages.length);const noSave=await page.evaluate(()=>platform.saveRun({distance:10,coins:0,hurdles:0,perfect:0,score:10}));assert(!noSave.ok);assert.equal(await frame.evaluate(()=>messages.length),before);
const spoof=await page.evaluate(async()=>{const wait=platform.askStartNg({type:'ignored'},'startng:user',120);window.postMessage({type:'startng:user',requestId:'untrusted',user:{id:999}},location.origin);return wait;});assert.equal(spoof,null);
console.log('Simulated platform contract passed: player lookup, character data, integer stats, save success/refusal, leaderboard, guest data, guest no-submit, untrusted message ignored.');
await browser.close();
