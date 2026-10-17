import test from 'node:test';
import assert from 'node:assert/strict';
import { Run, makeRow, HEIGHTS } from '../game/core.js';
const advance=(r,n)=>{for(let i=0;i<n;i++)r.step(1/60);};
test('procedural courses leave an open, reachable lane at every difficulty',()=>{
  let seed=13;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);let safe=1;
  for(let i=0;i<10000;i++){const row=makeRow(i*4,rand,safe);assert(Math.abs(row.safe-safe)<=1);assert(row.obstacles.length<=2);assert(!row.obstacles.some(o=>o.lane===row.safe));safe=row.safe;}
});
test('lane changes are smooth and constrained',()=>{const r=new Run();r.move(1);assert.equal(r.x,0);r.step(1/60);assert(r.x>0&&r.x<3.2);advance(r,60);assert(Math.abs(r.x-3.2)<.001);r.move(1);assert.equal(r.lane,2);});
test('jump returns to ground and does not double jump',()=>{const r=new Run();r.nextRow=1e6;r.jump();advance(r,15);const v=r.vy;r.jump();r.step(1/60);assert(r.vy<v);advance(r,90);assert.equal(r.y,0);assert.equal(r.vy,0);});
test('holding a jump produces a higher arc',()=>{const a=new Run(),b=new Run();a.jump();b.jump();b.held=true;advance(a,25);advance(b,25);assert(b.y>a.y);assert(a.y>HEIGHTS.high);});
test('aligned collision ends run; empty lane stays safe',()=>{const a=new Run();a.rows=[{z:-.8,obstacles:[{lane:1,type:'low'}]}];a.step(1/60);assert(a.dead);const b=new Run();b.rows=[{z:-.8,obstacles:[{lane:0,type:'hay'},{lane:2,type:'hay'}]}];advance(b,30);assert(!b.dead);});
test('jump clears a hurdle with a perfect bonus only once',()=>{const r=new Run();r.nextRow=1e6;r.jump();r.rows=[{z:-6.3,obstacles:[{lane:1,type:'medium',passed:false}]}];advance(r,60);assert(!r.dead);assert.equal(r.hurdles,1);assert.equal(r.perfect,1);assert.equal(r.score,Math.floor(r.distance)+250);});
test('duck clears overhead rail; jumping or standing collides',()=>{for(const lower of [true,false]){const r=new Run();r.rows=[{z:-.8,obstacles:[{lane:1,type:'arch'}]}];if(lower)r.lower();r.step(1/60);assert.equal(r.dead,!lower);}});
test('coins collect once and reset clears all run statistics',()=>{const r=new Run();r.pickups=[{lane:1,z:-.5,y:.95,taken:false}];advance(r,10);assert.equal(r.coins,1);assert.equal(r.score,Math.floor(r.distance)+25);r.reset();assert.equal(r.score,0);assert.equal(r.rows.length,0);assert(!r.dead);});
test('speed rises and is capped; long course uses bounded rows and coins',()=>{const r=new Run(()=>.4);for(let i=0;i<50000;i++){for(const row of r.rows)row.obstacles=[];r.step(1/60);}assert.equal(r.speed,33);assert(r.rows.length<8);assert(r.pickups.length<40);});
