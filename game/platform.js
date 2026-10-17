const ORIGIN='https://start.ng';
const hosted=location.hostname.endsWith('.start.ng');
let framePromise;
export let user=null;
export let player=null;
export async function askStartNg(message, replyType, timeoutMs=5000) {
  if(!hosted) return null;
  framePromise ??= new Promise(resolve=>{
    const frame=document.createElement('iframe');frame.hidden=true;frame.title='start.ng player connection';
    const timer=setTimeout(()=>resolve(null),timeoutMs);
    frame.onload=()=>{clearTimeout(timer);resolve(frame);};frame.onerror=()=>{clearTimeout(timer);resolve(null);};
    frame.src=ORIGIN+'/connect';document.body.append(frame);
  });
  const frame=await framePromise;if(!frame){framePromise=null;return null;}
  return new Promise(resolve=>{
    const requestId=crypto.randomUUID();
    const done=reply=>{clearTimeout(timer);removeEventListener('message',listener);resolve(reply);};
    const timer=setTimeout(()=>done(null),timeoutMs);
    const listener=e=>{if(e.origin===ORIGIN && e.source===frame.contentWindow && e.data?.type===replyType && e.data.requestId===requestId)done(e.data);};
    addEventListener('message',listener);frame.contentWindow.postMessage({...message,requestId},ORIGIN);
  });
}
export async function refreshPlayer() {
  const reply=await askStartNg({type:'startng:whoami'},'startng:user');
  user=reply?.user??null;player=reply?.user??reply?.guest??null;
  return {user,player};
}
export function signIn() { location.href=ORIGIN+'/?return_to='+encodeURIComponent(location.origin+location.pathname); }
export async function saveRun(stats) {
  if(!user)return {ok:false,error:'Guest ride saved on this device. Sign in to join the world leaderboard.'};
  const clean=Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,Math.max(0,Math.min(1e9,Math.floor(v)))]));
  return await askStartNg({type:'startng:score',stats:clean},'startng:scoreSaved') ?? {ok:false,error:'Could not reach start.ng. Your personal best is saved on this device.'};
}
export async function leaderboard() {
  if(!hosted)return {ok:false,error:'The world leaderboard connects when this game is live on start.ng.'};
  return await askStartNg({type:'startng:leaderboard',limit:10},'startng:leaderboardData') ?? {ok:false,error:'Leaderboard unavailable. Please try again.'};
}
