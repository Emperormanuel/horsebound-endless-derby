export const LANE = 3.2;
export const HEIGHTS = { low:0.65, medium:1.05, high:1.5, log:0.65, water:0.22, fence:1.2, hay:3.2, arch:0 };
export const JUMPABLE = ['low','medium','high','log','water','fence'];
export function makeRow(distance, random = Math.random, lastSafe = 1) {
  const phase = distance < 450 ? 0 : distance < 1400 ? 1 : 2;
  const safe = Math.max(0, Math.min(2, lastSafe + Math.floor(random()*3)-1));
  const choices = phase === 0 ? ['low','low','log','water'] : phase === 1 ? ['low','medium','fence','water','hay','arch'] : ['medium','high','fence','hay','arch','log'];
  const lanes = [0,1,2].filter(l=>l!==safe);
  if (random() < (phase === 0 ? 0.75 : 0.28)) lanes.splice(Math.floor(random()*2),1);
  return { safe, obstacles:lanes.map(lane=>({ lane, type:choices[Math.floor(random()*choices.length)], passed:false, crossed:false })) };
}
export class Run {
  constructor(random = Math.random) { this.random=random; this.reset(); }
  reset() {
    this.distance=0; this.coins=0; this.hurdles=0; this.perfect=0; this.speed=15; this.elapsed=0;
    this.lane=1; this.x=0; this.y=0; this.vy=0; this.duck=0; this.buffer=0; this.held=false;
    this.rows=[]; this.pickups=[]; this.nextRow=0; this.safe=1; this.dead=false; this.events=[]; this.id=0;
  }
  get score() { return Math.floor(this.distance) + this.coins*25 + this.hurdles*100 + this.perfect*150; }
  get phase() { return this.distance<450 ? 'Meadow warm-up' : this.distance<1400 ? 'Country canter' : 'Derby rush'; }
  move(dir) { this.lane=Math.max(0,Math.min(2,this.lane+dir)); }
  jump() { if(this.y<0.25) this.buffer=0.15; }
  lower() { this.duck=0.85; }
  step(dt) {
    if(this.dead) return;
    dt=Math.min(dt,1/30); this.events=[]; this.elapsed+=dt;
    this.speed=Math.min(33,15+this.distance/180); const dz=this.speed*dt; this.distance+=dz;
    this.x += ((this.lane-1)*LANE-this.x)*(1-Math.exp(-14*dt));
    this.duck=Math.max(0,this.duck-dt);
    if(this.buffer>0 && this.y===0) { this.vy=11; this.buffer=0; this.duck=0; this.events.push('jump'); }
    this.buffer=Math.max(0,this.buffer-dt);
    if(this.vy!==0 || this.y>0) {
      this.vy-=(this.held && this.vy>0 ? 22 : 26)*dt; this.y+=this.vy*dt;
      if(this.y<=0) { this.y=0; this.vy=0; this.events.push('land'); }
    }
    this.nextRow-=dz;
    if(this.nextRow<=0) {
      const row=makeRow(this.distance,this.random,this.safe); this.safe=row.safe;
      row.z=this.distance<1?-75:-130; row.id=this.id++; this.rows.push(row);
      const coinLane=this.random()<0.5 ? row.safe : Math.floor(this.random()*3);
      for(let i=0;i<5;i++) this.pickups.push({id:this.id++,lane:coinLane,z:row.z-7-i*3,y:0.95,taken:false});
      this.nextRow=this.speed*Math.max(1.5,2.7-this.distance/2000)+8;
    }
    for(const row of this.rows) {
      const previous=row.z; row.z+=dz;
      for(const ob of row.obstacles) {
        const aligned=Math.abs(this.x-(ob.lane-1)*LANE)<1.04;
        if(Math.abs(row.z)<1.12 && aligned) {
          const hit=ob.type==='arch' ? this.duck<=0 || this.y>0.1 : this.y<HEIGHTS[ob.type];
          if(hit) { this.dead=true; this.events.push('collision'); return; }
        }
        if(previous<=0 && row.z>0 && aligned && this.y>0.2 && JUMPABLE.includes(ob.type)) {
          ob.crossed=true;
          ob.perfect=Math.abs(this.vy)<2.8 && ob.type!=='water';
        }
        if(row.z>1.4 && !ob.passed) {
          ob.passed=true;
          if(ob.crossed) { this.hurdles++; this.events.push('clear'); if(ob.perfect){this.perfect++;this.events.push('perfect');} }
        }
      }
    }
    for(const coin of this.pickups) {
      coin.z+=dz;
      if(!coin.taken && Math.abs(coin.z)<1.25 && Math.abs(this.x-(coin.lane-1)*LANE)<0.85 && Math.abs(this.y+0.95-coin.y)<1.4) {
        coin.taken=true;this.coins++;this.events.push('coin');
      }
    }
    this.rows=this.rows.filter(r=>r.z<18); this.pickups=this.pickups.filter(c=>c.z<18);
  }
}
