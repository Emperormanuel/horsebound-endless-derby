import { Run } from './core.js';
import { World } from './world.js';
import { Audio } from './audio.js';
import * as platform from './platform.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const cover=params.has('cover');
let world;
try { world=new World($('world')); } catch(error) { $('fatal').hidden=false;throw error; }
const run=new Run(),audio=new Audio();let state='menu',previousPanel='menu',last=performance.now(),clock=0,toastUntil=0,runToken=0,slowFrames=0;
const storage={get(k,d){try{return localStorage.getItem(k)??d;}catch{return d;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
let best=Number(storage.get('horsebound.best','0'))||0;
audio.enabled=storage.get('horsebound.sound','on')==='on';
$('menu-best').textContent=best.toLocaleString();
function soundButtons(){document.querySelectorAll('.sound').forEach(b=>{b.textContent=b.classList.contains('icon-button')?(audio.enabled?'♪':'×'):(audio.enabled?'Sound on ♪':'Sound off ×');b.setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');b.setAttribute('aria-pressed',String(audio.enabled));});}
soundButtons();document.querySelectorAll('.sound').forEach(b=>b.onclick=()=>{audio.init();audio.enabled=!audio.enabled;storage.set('horsebound.sound',audio.enabled?'on':'off');soundButtons();});
function panel(name){$('overlay').hidden=!name;document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==name);if(name)requestAnimationFrame(()=>$(name).querySelector('button')?.focus());}
function start(){runToken++;run.reset();state='playing';clock=0;audio.nextHoof=0;audio.init();panel(null);$('menu').hidden=true;$('hud').hidden=false;document.body.classList.add('riding');$('toast').textContent='Find your stride.';toastUntil=2.5;updateHud();}
function menu(){runToken++;run.reset();state='menu';panel(null);$('menu').hidden=false;$('hud').hidden=true;document.body.classList.remove('riding');$('menu-best').textContent=best.toLocaleString();$('play').focus();}
function pause(){if(state==='playing'){state='paused';run.held=false;run.buffer=0;panel('pause-panel');}else if(state==='paused'){state='playing';panel(null);audio.init();}}
function updateHud(){for(const [id,v]of Object.entries({distance:Math.floor(run.distance),coins:run.coins,hurdles:run.hurdles,score:run.score,speed:Math.round(run.speed*3.6)}))$(id).textContent=v.toLocaleString();$('phase').textContent=run.phase;}
async function finish(){
  state='over';world.hitTime=clock;run.held=false;const token=++runToken;const distance=Math.floor(run.distance),record=distance>best;
  best=Math.max(best,distance);storage.set('horsebound.best',String(best));
  for(const [id,value]of Object.entries({'final-distance':distance,'final-coins':run.coins,'final-hurdles':run.hurdles,'final-perfect':run.perfect,'final-score':run.score}))$(id).textContent=value.toLocaleString();
  $('final-best').textContent=best.toLocaleString()+' m';$('result-label').textContent=record?'A NEW PERSONAL BEST':'A RIDE TO REMEMBER';
  $('save-status').textContent=platform.user?'Saving your ride…':'Guest ride saved on this device. Sign in from the main menu to join the world leaderboard.';
  panel('over-panel');const saved=await platform.saveRun({distance,coins:run.coins,hurdles:run.hurdles,perfect:run.perfect,score:run.score});
  if(token!==runToken)return;
  $('save-status').textContent=saved.ok?(saved.result?.improved?`New world-board best! Rank #${saved.result.rank}.`:`Ride submitted. Your best run stays on the board${saved.result?.rank?' at #'+saved.result.rank:''}.`):(saved.error||'Could not save to start.ng. Your local best is safe.');
}
for(const id of ['play','restart','again'])$(id).onclick=start;
$('pause').onclick=pause;$('resume').onclick=pause;document.querySelectorAll('.to-menu').forEach(b=>b.onclick=menu);
$('how').onclick=()=>{previousPanel='menu';panel('help-panel');};
document.querySelectorAll('.close-panel').forEach(b=>b.onclick=()=>{if(previousPanel==='over')panel('over-panel');else panel(null);});
document.querySelectorAll('.show-board').forEach(b=>b.onclick=async()=>{
  previousPanel=state==='over'?'over':'menu';panel('board-panel');const target=$('board-content');target.textContent='Loading leaderboard…';
  const board=await platform.leaderboard();if(!board.ok){target.textContent=board.error||'The leaderboard could not be loaded. Try again in a moment.';return;}
  if(!Array.isArray(board.entries)||!board.entries.length){target.textContent='An open field. Sign in and set the first distance!';return;}
  const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');for(const label of ['Rank','Rider','Metres','Coins']){const th=document.createElement('th');th.textContent=label;tr.append(th);}head.append(tr);table.append(head);const body=document.createElement('tbody');
  for(const entry of board.entries){const row=document.createElement('tr');if(entry.player_id===platform.user?.id)row.className='own-row';for(const value of [entry.rank,entry.name,entry.stats?.distance??entry.score,entry.stats?.coins??0]){const td=document.createElement('td');td.textContent=String(value);row.append(td);}body.append(row);}table.append(body);target.replaceChildren(table);
});
let refreshing=false;
async function refresh(){if(refreshing)return;refreshing=true;try{const {user,player}=await platform.refreshPlayer();if(!cover)world.setStyle(player?.style);$('player-name').textContent=player?.name||'Guest rider';$('player-account').textContent=user?.account?'@'+user.account:location.hostname.endsWith('.start.ng')?'Riding as a guest':'Your next great ride awaits';$('signin').hidden=!!user;const face=player?.face;if(typeof face==='string'&&/^data:image\/png;base64,/.test(face)){$('face').src=face;$('face').hidden=false;}else $('face').hidden=true;}finally{refreshing=false;}}
$('signin').onclick=platform.signIn;refresh();addEventListener('focus',refresh);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(state==='playing')pause();run.held=false;}else refresh();});
addEventListener('blur',()=>{if(state==='playing')pause();});
function action(name){if(state!=='playing')return;if(name==='left')run.move(-1);if(name==='right')run.move(1);if(name==='jump')run.jump();if(name==='duck')run.lower();}
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',ArrowDown:'duck',KeyS:'duck'};
addEventListener('keydown',e=>{
  if(e.code==='Tab'&&!$('overlay').hidden){const controls=[...document.querySelector('.panel:not([hidden])').querySelectorAll('button,a[href]')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  if(keys[e.code]&&state==='playing'){e.preventDefault();if(!e.repeat)action(keys[e.code]);if(keys[e.code]==='jump')run.held=true;}
  if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){if(!$('overlay').hidden&&!$('help-panel').hidden||!$('overlay').hidden&&!$('board-panel').hidden){if(previousPanel==='over')panel('over-panel');else panel(null);}else pause();}
});
addEventListener('keyup',e=>{if(keys[e.code]==='jump')run.held=false;});
let touch=null;
$('world').addEventListener('pointerdown',e=>{if(state==='playing'){touch={x:e.clientX,y:e.clientY,id:e.pointerId};$('world').setPointerCapture(e.pointerId);}});
$('world').addEventListener('pointerup',e=>{if(!touch||touch.id!==e.pointerId)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)action('jump');else if(Math.abs(dx)>Math.abs(dy))action(dx>0?'right':'left');else action(dy<0?'jump':'duck');});
$('world').addEventListener('pointercancel',()=>touch=null);
document.querySelectorAll('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.control);if(b.dataset.control==='jump')run.held=true;b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',()=>run.held=false);b.addEventListener('pointercancel',()=>run.held=false);});
function update(dt){
  clock+=dt;
  if(state==='playing'){
    run.step(dt);if(run.y===0)audio.hoof(clock,run.speed);for(const event of run.events){audio.play(event);if(event==='perfect'){$('toast').textContent='Perfect stride! +250';toastUntil=clock+1.3;}else if(event==='clear'&&!run.events.includes('perfect')){$('toast').textContent='Beautifully cleared. +100';toastUntil=clock+1;}else if(event==='coin'&&toastUntil<clock){$('toast').textContent='+25';toastUntil=clock+.5;}}
    if(clock>toastUntil)$('toast').textContent='';updateHud();if(run.dead)finish();
  }
  world.render(run,state,clock,dt,cover);
}
if(cover){$('topbar').hidden=true;$('menu').hidden=true;document.querySelector('.vignette').hidden=true;$('cover-type').hidden=false;state='paused';run.y=1.15;run.vy=3;run.rows=[{id:999,z:0,obstacles:[{lane:1,type:'medium'}]}];world.setStyle({body:'female',primaryColor:'#315c4d',secondaryColor:'#ece0bc',skinColor:'#8d5524',hair:'ponytail',hairColor:'#17120f',hat:'cap'});}
const testMode=params.has('test')&&['localhost','127.0.0.1'].includes(location.hostname);
if(testMode)window.__horsebound={run,world,get state(){return state;},advance(n){for(let i=0;i<n;i++)update(1/60);},start,menu};
function frame(now){const raw=(now-last)/1000;last=now;const dt=Math.min(raw,1/30);
  if(!testMode)update(dt);else world.render(run,state,clock,dt,cover);
  if(raw>.035 && ++slowFrames>100 && world.renderer.getPixelRatio()>1){world.renderer.setPixelRatio(1);world.renderer.shadowMap.enabled=false;world.resize();slowFrames=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
