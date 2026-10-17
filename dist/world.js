import * as T from './vendor/three.module.js';
import { LANE, HEIGHTS } from './core.js';
const palette={grass:0x78a651,sand:0xdac49c,white:0xf9f2d8,wood:0x825237,red:0xe27953,leaf:0x487650};
const materials=new Map();
function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:0.92,flatShading:true}));return materials.get(c);}
const geometries={box:new T.BoxGeometry(1,1,1),ball:new T.IcosahedronGeometry(1,1),cylinder:new T.CylinderGeometry(1,1,1,8),cone:new T.ConeGeometry(1,1,7)};
function mesh(parent,shape,color,x,y,z,sx,sy,sz){const m=new T.Mesh(geometries[shape],mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const box=(p,c,x,y,z,a,b,d)=>mesh(p,'box',c,x,y,z,a,b,d);
const ball=(p,c,x,y,z,a,b,d)=>mesh(p,'ball',c,x,y,z,a,b,d);
function rod(p,c,a,b,r=.035){const delta=new T.Vector3(...b).sub(new T.Vector3(...a));const m=mesh(p,'cylinder',c,...new T.Vector3(...a).addScaledVector(delta,.5).toArray(),r,delta.length(),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
export class World {
  constructor(canvas){
    this.scene=new T.Scene();this.scene.background=new T.Color(0xb8d9d0);this.scene.fog=new T.Fog(0xb8d9d0,65,190);
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.camera=new T.PerspectiveCamera(46,innerWidth/innerHeight,.1,280);this.camera.position.set(9,5,11);this.scene.add(new T.HemisphereLight(0xfff7dd,0x5e7951,2.6));
    const sun=new T.DirectionalLight(0xffedd0,3.1);sun.position.set(-25,45,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-35;sun.shadow.normalBias=.035;this.scene.add(sun);
    box(this.scene,palette.grass,0,-.35,-75,500,.5,500);
    box(this.scene,palette.sand,0,-.075,-75,11,.15,250);
    box(this.scene,0xbda97c,-5.7,-.03,-75,.28,.08,250);box(this.scene,0xbda97c,5.7,-.03,-75,.28,.08,250);
    this.stripes=[];for(let i=0;i<44;i++){for(const x of [-1.6,1.6])this.stripes.push(box(this.scene,0xeee0b7,x,.015,-i*5,.055,.02,2));}
    this.scenery=[];for(let i=0;i<22;i++){const g=new T.Group();g.position.z=-i*10;this.scene.add(g);this.scenery.push(g);
      for(const side of [-1,1]){for(const x of [6.2]){box(g,palette.white,side*x,.65,0,.15,1.3,.15);box(g,palette.white,side*x,.48,-5,.11,.11,10);box(g,palette.white,side*x,1.03,-5,.11,.11,10);}
        if(i%2===0)this.tree(g,side*(11+(i%3)*3),0,-3,1+(i%4)*.18);
        if(i%4===0){box(g,0xb1a583,side*7,2,0,.08,4,.08);const flag=box(g,i%8===0?palette.red:0xe9bc51,side*7+side*.65,3.6,0,1.3,.65,.035);flag.rotation.z=side*.08;}
        if(i%7===0)this.stand(g,side*15,0,-5,side);
        if(i%3===0){for(let n=0;n<4;n++)ball(g,n%2?0xe9d090:0xe6e7b5,side*(7.5+n*.6),.15,-4+n*.4,.14,.18,.14);}
      }
    }
    // Two recycled, instanced scenery tiles keep draw calls independent of tree count.
    const source=new T.Group();this.scene.add(source);for(const g of [...this.scenery,...this.stripes])source.attach(g);source.updateMatrixWorld(true);
    const batches=new Map();source.traverse(m=>{if(!m.isMesh)return;const key=m.geometry.uuid+':'+m.material.uuid;if(!batches.has(key))batches.set(key,{geometry:m.geometry,material:m.material,matrices:[]});batches.get(key).matrices.push(m.matrixWorld.clone());});
    const tile=new T.Group();for(const batch of batches.values()){const instanced=new T.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((matrix,i)=>instanced.setMatrixAt(i,matrix));instanced.castShadow=true;instanced.receiveShadow=true;instanced.computeBoundingSphere();tile.add(instanced);}
    this.scene.remove(source);const second=tile.clone();second.position.z=-220;this.scene.add(tile,second);this.scenery=[tile,second];this.stripes=[];
    for(let i=0;i<12;i++){ball(this.scene,i%2?0x719d79:0x88ad7e,(i-6)*32,-3,-145-(i%3)*15,29,14+(i%4)*5,24);}
    for(let i=0;i<9;i++){const g=new T.Group();g.position.set((i-4)*30,25+(i%3)*5,-90-(i%4)*22);for(let j=0;j<3;j++)ball(g,0xf5f1d8,j*4,Math.sin(j)*1.5,0,5,2,2.5);this.scene.add(g);}
    this.horse=new T.Group();this.scene.add(this.horse);this.buildHorse();
    this.obstacleMeshes=new Map();this.coinMeshes=new Map();this.obstaclePool={};this.coinPool=[];
    this.dust=[];for(let i=0;i<14;i++){const p=ball(this.scene,0xe6d3a9,0,0,0,.09,.09,.09);p.visible=false;this.dust.push(p);}
    this.resize();addEventListener('resize',()=>this.resize());
  }
  tree(g,x,y,z,s){const t=new T.Group();t.position.set(x,y,z);t.scale.setScalar(s);g.add(t);box(t,0x786247,0,1.2,0,.35,2.4,.35);ball(t,0x577d4c,0,3.2,0,1.8,2.0,1.65);ball(t,0x729751,.9,2.8,.1,1.2,1.3,1.2);}
  stand(g,x,y,z,side){const s=new T.Group();s.position.set(x,y,z);s.rotation.y=side*Math.PI/2;g.add(s);box(s,0xa89674,0,.5,0,6,1,3.5);for(let row=0;row<3;row++){box(s,0xd7cdb0,0,.7+row*.35,-row*.8,6,.2,.75);for(let n=0;n<5;n++){box(s,[0xe1b24e,0xd77753,0x3e6e68][(n+row)%3],n-2,1.1+row*.35,-row*.8,.35,.5,.3);ball(s,0xb28a65,n-2,1.52+row*.35,-row*.8,.18,.2,.18);}}for(const x2 of [-3,3])box(s,0xf8efd5,x2,2,0,.12,4,.12);const roof=box(s,0xc36549,0,3.9,-.3,7,.18,4.5);roof.rotation.x=.07;}
  buildHorse(){const h=this.horse;this.body=new T.Group();h.add(this.body);const b=this.body;
    ball(b,0x96532f,0,1.65,0,.63,.69,1.17);ball(b,0xad6840,0,1.74,-.55,.57,.64,.7);ball(b,0x8d4b2c,0,1.68,.7,.57,.64,.62);
    this.neck=new T.Group();this.neck.position.set(0,1.8,-.8);b.add(this.neck);const neck=ball(this.neck,0xa76339,0,.5,-.38,.4,.86,.42);neck.rotation.x=-.45;
    ball(this.neck,0xb47146,0,1.12,-.69,.31,.37,.63);ball(this.neck,0x6b3c29,0,.97,-1.12,.26,.23,.25);
    box(this.neck,0xefe1be,0,1.19,-1.21,.12,.34,.025);
    for(const side of [-1,1]){const ear=mesh(this.neck,'cone',0x8c492b,side*.21,1.55,-.57,.13,.42,.12);ear.rotation.z=-side*.18;ball(this.neck,0x241f19,side*.29,1.21,-.86,.035,.06,.06);box(this.neck,0x3d2a24,side*.3,1.05,-.87,.035,.07,.7);}
    for(let i=0;i<6;i++)box(this.neck,0x3d2a24,0,.1+i*.19,-.02-i*.085,.18,.23,.16);
    this.legs=[];for(const x of [-.43,.43])for(const z of [-.72,.78]){const leg=new T.Group();leg.position.set(x,1.55,z);b.add(leg);const upper=box(leg,0x8e4e2e,0,-.34,0,.22,.68,.25);const knee=new T.Group();knee.position.y=-.66;leg.add(knee);box(knee,0xb97b50,0,-.32,0,.14,.64,.16);box(knee,0xf1ddad,0,-.56,0,.15,.2,.17);box(knee,0x352d25,0,-.77,-.055,.23,.2,.32);this.legs.push({leg,knee,z,x});}
    this.tail=new T.Group();this.tail.position.set(0,1.98,1.05);b.add(this.tail);const tail=ball(this.tail,0x3b2922,0,-.4,.25,.17,.65,.21);tail.rotation.x=-.5;
    box(b,0xe4ba60,0,2.2,.15,1.13,.14,.9);ball(b,0x433126,0,2.29,.2,.5,.16,.5);for(const side of [-1,1]){rod(b,0x4b3226,[side*.52,2.23,.1],[side*.64,1.5,.15],.035);box(b,0xa5997a,side*.64,1.48,.15,.15,.055,.27);}
    this.rider=new T.Group();this.rider.position.set(0,2.25,.1);b.add(this.rider);this.setStyle(null);
    for(const side of [-1,1])rod(b,0x352a23,[side*.27,2.85,-1.65],[side*.3,2.82,-.42],.022);
  }
  setStyle(style){
    const s=style||{};const p=this.rider;p.clear();
    const top=color(s.primaryColor,'#b0b0b0'),bottom=color(s.secondaryColor,'#555555'),skin=color(s.skinColor,'#d4a574'),hair=color(s.hairColor,'#3b2a20');
    const female=s.body==='female';box(p,bottom,0,.04,0,.49,.2,.45);const torso=box(p,top,0,.5,-.07,female?.46:.54,.72,.36);torso.rotation.x=-.15;
    for(const side of [-1,1]){rod(p,bottom,[side*.27,.08,0],[side*.62,-.4,-.08],.13);rod(p,bottom,[side*.62,-.4,-.08],[side*.59,-.83,.2],.11);box(p,0x2e3029,side*.59,-.88,.12,.23,.25,.4);rod(p,top,[side*.28,.72,-.05],[side*.32,.35,-.45],.11);rod(p,skin,[side*.32,.35,-.45],[side*.28,.4,-.65],.085);}
    ball(p,skin,0,1.1,-.17,.26,.31,.25);for(const side of [-1,1])ball(p,0x22291f,side*.09,1.13,-.4,.022,.025,.018);
    const hs=s.hair||'short';if(hs!=='bald'){ball(p,hair,0,1.3,-.11,.27,hs==='afro'?.31:.14,.26);if(hs==='afro')for(let i=0;i<7;i++)ball(p,hair,Math.cos(i)*.2,1.28+Math.sin(i)*.12,-.05,.16,.16,.16);if(hs==='bun')ball(p,hair,0,1.43,.04,.17,.17,.17);if(hs==='ponytail')ball(p,hair,0,1.12,.15,.14,.36,.15);if(hs==='braids'||hs==='dreads')for(const side of [-1,1])for(let i=0;i<3;i++)ball(p,hair,side*.23,.97-i*.12,.02,.07,.12,.08);}
    const hat=s.hat||'none';if(hat==='cap'){ball(p,top,0,1.37,-.15,.3,.15,.27);box(p,top,0,1.33,-.43,.39,.04,.25);}if(hat==='beanie')ball(p,top,0,1.4,-.12,.29,.21,.27);
    if(hat==='tophat'){mesh(p,'cylinder',0x253a35,0,1.4,-.14,.36,.06,.34);mesh(p,'cylinder',0x253a35,0,1.62,-.14,.24,.4,.24);}if(hat==='crown'){mesh(p,'cylinder',0xeac255,0,1.4,-.14,.28,.18,.27);for(let i=0;i<5;i++)mesh(p,'cone',0xeac255,Math.sin(i*1.26)*.25,1.56,-.14+Math.cos(i*1.26)*.25,.08,.24,.08);}
    const a=s.accessory;if(a==='backpack')box(p,0xa47e42,0,.55,.2,.43,.54,.25);if(a==='scarf'){box(p,0xd76e49,0,.88,-.08,.52,.13,.4);box(p,0xd76e49,.16,.6,-.29,.17,.5,.07);}if(a==='beard')ball(p,hair,0,.94,-.34,.2,.17,.12);if(a==='earrings')for(const side of [-1,1])ball(p,0xf1ca5d,side*.27,1.03,-.15,.045,.07,.035);if(a==='glasses'){for(const side of [-1,1])box(p,0x233c35,side*.12,1.14,-.411,.18,.12,.035);box(p,0x233c35,0,1.14,-.42,.1,.025,.025);}
  }
  obstacle(type){
    const g=new T.Group(),h=HEIGHTS[type];
    if(['low','medium','high','fence'].includes(type)){for(const side of [-1,1]){box(g,palette.white,side*1.18,(h+.25)/2,0,.15,h+.25,.19);box(g,palette.wood,side*1.18,.08,0,.5,.16,.55);}for(let j=0;j<(type==='fence'?3:2);j++){const y=h-j*.27;for(let i=0;i<6;i++)box(g,i%2?palette.white:(type==='high'?0x507c85:palette.red),-1+i*.4,y,0,.4,.18,.18);}if(type==='high')for(const side of [-1,1])mesh(g,'cone',0xe3bf59,side*1.18,h+.45,0,.14,.3,.14);}
    if(type==='log'){const log=mesh(g,'cylinder',palette.wood,0,.35,0,.38,2.5,.38);log.rotation.z=Math.PI/2;for(const side of [-1,1]){const end=mesh(g,'cylinder',0xc9965f,side*1.26,.35,0,.3,.02,.3);end.rotation.z=Math.PI/2;}}
    if(type==='water'){box(g,0x7599a0,0,.03,0,2.7,.05,2.1);for(let i=0;i<4;i++)box(g,0xb2d5ce,-.8+i*.5,.063,(i%2)*.5-.3,.4,.01,.05);}
    if(type==='hay'){for(let i=0;i<3;i++){box(g,0xd9ad51,0,.5+i*.77,0,2.3-i*.28,.8,1.35);for(const x of [-.6,.6])box(g,0xa98640,x,.5+i*.77,.69,.08,.78,.02);}box(g,0xe9c36b,0,2.8,0,1.5,.45,1.3);}
    if(type==='arch'){for(const side of [-1,1])box(g,0x76826a,side*1.3,2,0,.13,4,.15);box(g,0xc78757,0,3.22,0,2.7,.33,.32);for(let i=0;i<5;i++){const flag=mesh(g,'cone',i%2?0xf0c368:0xd27151,-1+i*.5,2.88,0,.2,.38,.04);flag.rotation.z=Math.PI;}}
    return g;
  }
  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
  render(run,mode,time,dt,cover=false){
    const playing=mode==='playing',race=mode!=='menu';const motion=playing?run.speed:mode==='menu'?4:0;
    for(const g of this.scenery){g.position.z+=motion*dt;if(g.position.z>220)g.position.z-=440;}
    for(const stripe of this.stripes){stripe.position.z+=motion*dt;if(stripe.position.z>15)stripe.position.z-=275;}
    const cadence=time*(playing?run.speed*.75:5);const moving=playing||mode==='menu';const airborne=run.y>0 && race;
    this.horse.position.set(race?run.x:0,race?run.y:0,0);this.horse.rotation.z=race?((run.lane-1)*LANE-run.x)*-.055:0;
    this.body.position.y=moving&&!airborne?Math.abs(Math.sin(cadence))*0.07:0;this.body.rotation.x=airborne?-run.vy*.018:0;
    this.neck.rotation.x=moving?Math.sin(cadence)*.045:0;this.tail.rotation.z=Math.sin(time*4)*.18;
    this.rider.rotation.x=race&&run.duck>0?-1.0:airborne?-.3:0;
    for(const l of this.legs){const phase=cadence+(l.z>0?1.8:0)+(l.x>0?1.2:0);l.leg.rotation.x=airborne?(l.z<0?-1:.7):moving?Math.sin(phase)*.65:0;l.knee.rotation.x=airborne?1.3:Math.max(0,Math.cos(phase))*.85;}
    const active=new Set();for(const row of run.rows)for(const ob of row.obstacles){const id=row.id+':'+ob.lane;active.add(id);let m=this.obstacleMeshes.get(id);if(!m){m=this.obstaclePool[ob.type]?.pop()||this.obstacle(ob.type);m.userData.type=ob.type;this.scene.add(m);this.obstacleMeshes.set(id,m);}m.visible=race;m.position.set((ob.lane-1)*LANE,0,row.z);}
    for(const [id,m] of this.obstacleMeshes)if(!active.has(id)){m.visible=false;this.scene.remove(m);(this.obstaclePool[m.userData.type]??=[]).push(m);this.obstacleMeshes.delete(id);}
    const coins=new Set();for(const c of run.pickups){coins.add(c.id);let m=this.coinMeshes.get(c.id);if(!m){m=this.coinPool.pop()||mesh(new T.Group(),'cylinder',0xf1c450,0,0,0,.25,.075,.25);this.scene.add(m);this.coinMeshes.set(c.id,m);}m.position.set((c.lane-1)*LANE,c.y+Math.sin(time*3+c.id)*.1,c.z);m.rotation.set(Math.PI/2,time*2,0);m.visible=race&&!c.taken;}
    for(const [id,m] of this.coinMeshes)if(!coins.has(id)){m.visible=false;this.scene.remove(m);this.coinPool.push(m);this.coinMeshes.delete(id);}
    for(let i=0;i<this.dust.length;i++){const p=this.dust[i],age=(time*2+i/this.dust.length)%1;p.visible=moving&&!airborne;p.position.set(this.horse.position.x+Math.sin(i*7)*.48,age*.6+.05,1+age*2);p.scale.setScalar(.06+age*.13);}
    const mobile=innerWidth<700;
    const cameraTarget=cover?new T.Vector3(8,4.6,9):race?new T.Vector3(run.x*.28,5.4+run.y*.12,10.3):mobile?new T.Vector3(9,5.3,10):new T.Vector3(9,5.0,11);
    this.camera.position.lerp(cameraTarget,1-Math.exp(-dt*4));
    const aim=cover?new T.Vector3(-1,2,-2):race?new T.Vector3(run.x*.2,1.3,-13):mobile?new T.Vector3(-2,1.4,-2):new T.Vector3(-3.3,1.5,-3);
    if(mode==='over'&&time-this.hitTime<.35)this.camera.position.x+=Math.sin(time*100)*.08;
    this.camera.lookAt(aim);this.renderer.render(this.scene,this.camera);
  }
}
