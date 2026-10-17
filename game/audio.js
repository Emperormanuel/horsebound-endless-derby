export class Audio {
  constructor(){this.enabled=true;this.ctx=null;this.nextHoof=0;}
  init(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C();}this.ctx?.resume().catch(()=>{});}
  tone(freq,duration=.12,type='sine',volume=.08,end=freq){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration);}
  play(event){if(event==='jump')this.tone(220,.2,'sine',.06,520);if(event==='land')this.tone(90,.12,'triangle',.14,35);if(event==='coin')this.tone(980,.13,'sine',.05,1500);if(event==='clear')this.tone(550,.16,'triangle',.05,900);if(event==='perfect')this.tone(800,.3,'sine',.09,1600);if(event==='collision')this.tone(145,.45,'sawtooth',.1,25);}
  hoof(time,speed){if(time>this.nextHoof){this.tone(95+Math.random()*30,.06,'triangle',.06,35);this.nextHoof=time+2.9/speed;}}
}
