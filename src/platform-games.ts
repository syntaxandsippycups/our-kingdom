type Host = { root: HTMLElement; close: () => void; toast: (message: string) => void };
type Floor = { y: number; spans: [number, number][] };
type Body = { x: number; y: number; vx: number; vy: number; floor: number; grounded: boolean; climbing: boolean; ladderTargetFloor?: number; ladderX?: number; face: number; walk: number; hurt: number; duck: boolean };
const W = 960, H = 560, FLOOR_Y = [500, 385, 270, 155];
const WALKWAYS: Floor[] = [
  { y: FLOOR_Y[0], spans: [[0, 1680]] },
  { y: FLOOR_Y[1], spans: [[0, 340], [390, 760], [810, 1190], [1240, 1680]] },
  { y: FLOOR_Y[2], spans: [[0, 300], [350, 690], [740, 1080], [1130, 1450], [1500, 1680]] },
  { y: FLOOR_Y[3], spans: [[0, 410], [460, 850], [900, 1260], [1310, 1680]] },
];
const LADDERS = [170, 590, 970];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function page(root: HTMLElement, title: string, eyebrow: string, intro: string, leaveId: string, canvasId: string, hud: string, hints: string) {
  root.innerHTML = `<section class="runner-game platform-game"><header class="mini-head runner-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${intro}</p></div><button class="btn secondary" id="${leaveId}">Back to the story</button></header><div class="platform-hud">${hud}</div><canvas id="${canvasId}" width="960" height="560" aria-label="Multi-level scaffold platform game with working ladders"></canvas><div class="platform-hint">${hints}<span class="platform-legend">Walk A / D · climb ↑ / ↓ at ladders · jump Space · duck S / ↓ away from ladders · use E · swat J</span></div><div class="runner-touch"><button data-key="a">◀</button><button data-key="w">UP</button><button data-action="jump">JUMP</button><button data-key="s">DUCK</button><button data-key="arrowdown">DOWN</button><button data-action="use">USE</button><button data-action="attack">SWAT</button><button data-key="d">▶</button></div></section>`;
}
function begin(host: Host, leaveId: string, canvasId: string) {
  const canvas = host.root.querySelector<HTMLCanvasElement>(`#${canvasId}`)!;
  const ctx = canvas.getContext("2d")!;
  const keys = new Set<string>();
  let raf = 0, last = performance.now(), jump = false, use = false, attack = false, disposed = false;
  const down = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) e.preventDefault(); keys.add(k); if ([" ", "w", "arrowup"].includes(k)) jump = true; if (k === "e") use = true; if (k === "j") attack = true; };
  const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", down); window.addEventListener("keyup", up);
  const cleanup = () => { if (disposed) return; disposed = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); host.close(); };
  host.root.querySelector<HTMLButtonElement>(`#${leaveId}`)!.onclick = cleanup;
  host.root.querySelectorAll<HTMLButtonElement>(".runner-touch [data-key]").forEach(b => {
    const key=b.dataset.key||"d";
    b.onpointerdown = e => { e.preventDefault(); keys.add(key); };
    b.onpointerup = b.onpointerleave = () => keys.delete(key);
  });
  host.root.querySelector<HTMLButtonElement>('[data-action="jump"]')!.onpointerdown = e => { e.preventDefault(); jump = true; };
  host.root.querySelector<HTMLButtonElement>('[data-action="use"]')!.onpointerdown = e => { e.preventDefault(); use = true; };
  host.root.querySelector<HTMLButtonElement>('[data-action="attack"]')!.onpointerdown = e => { e.preventDefault(); attack = true; };
  const hero = new Image(); hero.src = "/assets/characters/aaron-walk-sheet.png";
  return { canvas, ctx, keys, hero, cleanup, next: (draw: (time:number)=>void) => { if (!disposed) raf = requestAnimationFrame(draw); }, take: () => { const out = { jump, use, attack }; jump = use = attack = false; return out; }, last: (n: number) => last = n, getLast: () => last, dispose: () => disposed };
}
function drawWorld(ctx: CanvasRenderingContext2D, cam: number, time: number, room = "", backdrop?: HTMLImageElement, darkness = .3) {
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#17252a"); sky.addColorStop(.66, "#382d35"); sky.addColorStop(1, "#171b1a"); ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
  if(backdrop?.complete&&backdrop.naturalWidth){const bw=H*backdrop.naturalWidth/backdrop.naturalHeight,offset=-((cam*.24)%(bw));for(let x=offset-bw;x<W;x+=bw)ctx.drawImage(backdrop,x,0,bw,H);ctx.fillStyle=`rgba(10,15,18,${darkness})`;ctx.fillRect(0,0,W,H);}
  else for (let i=0;i<8;i++) { const x=((i*237-cam*.22)%1100+1100)%1100; ctx.fillStyle = `rgba(255,218,164,${.08+(i%3)*.035})`; ctx.beginPath(); ctx.arc(x, 95+(i%4)*58, 30+(i%3)*17, 0, Math.PI*2); ctx.fill(); }
  if(!backdrop?.complete||!backdrop.naturalWidth){ctx.fillStyle="#253a35";for(let y=0;y<4;y++){const py=FLOOR_Y[y]!+38;ctx.fillRect(0,py,W,H-py);}}
  WALKWAYS.forEach((fl,fi)=>fl.spans.forEach(([a,b],i)=>{
    const x=a-cam, ww=b-a; if(x>W||x+ww<0)return;
    ctx.fillStyle=fi===0?"#865d45":(fi===3?"#bc6b70":"#9b6572");
    ctx.beginPath();ctx.moveTo(x,fl.y);ctx.lineTo(x+ww,fl.y-10);ctx.lineTo(x+ww,fl.y+4);ctx.lineTo(x,fl.y+14);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#f4b8a2";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,fl.y);ctx.lineTo(x+ww,fl.y-10);ctx.stroke();
    for(let sx=a+22;sx<b;sx+=65){ctx.fillStyle="#e9b98655";ctx.fillRect(sx-cam,fl.y+4,4,10);}
    if(i===0){ctx.strokeStyle="#4b3943";ctx.lineWidth=5;for(let sx=a+30;sx<b;sx+=180){ctx.beginPath();ctx.moveTo(sx-cam,fl.y+8);ctx.lineTo(sx+90-cam,fl.y+110);ctx.stroke();}}
  }));
  LADDERS.forEach((x,i)=>{const sx=x-cam;if(sx<-50||sx>W+50)return;ctx.strokeStyle="#d6ad83";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(sx-10,FLOOR_Y[i]!-2);ctx.lineTo(sx-10,FLOOR_Y[i+1]!+10);ctx.moveTo(sx+10,FLOOR_Y[i]!-2);ctx.lineTo(sx+10,FLOOR_Y[i+1]!+10);ctx.stroke();ctx.lineWidth=3;for(let y=FLOOR_Y[i+1]!+13;y<FLOOR_Y[i]!-3;y+=19){ctx.beginPath();ctx.moveTo(sx-10,y);ctx.lineTo(sx+10,y);ctx.stroke();}});
  if(room){ctx.fillStyle="#fff0cf";ctx.font="bold 13px Arial";ctx.textAlign="left";ctx.fillText(room,20,28);}
}
function drawAaron(ctx: CanvasRenderingContext2D, hero: HTMLImageElement, p: Body, cam: number, time: number, carrying = "") {
  const x=p.x-cam, yy=p.y, sw=443, sh=443; ctx.save(); if(p.hurt>0&&Math.floor(time/90)%2)ctx.globalAlpha=.45;
  if(hero.complete&&hero.naturalWidth){
    const walking=p.grounded&&Math.abs(p.vx)>25, frame=p.climbing?Math.floor(time/110)%8:(walking?Math.floor(p.walk)%8:0), sx=frame%4*sw,sy=Math.floor(frame/4)*sh;
    const h=p.duck?49:72, y=yy+57-h, climbBob=p.climbing?Math.sin(time/105)*2:0;
    if(!p.grounded&&!p.climbing){ctx.translate(x+29,yy+30);ctx.rotate(p.face*.09);ctx.translate(-(x+29),-(yy+30));}
    if(p.face<0){ctx.translate(x+58,0);ctx.scale(-1,1);ctx.drawImage(hero,sx,sy,sw,sh,0,y+climbBob,58,h);}else ctx.drawImage(hero,sx,sy,sw,sh,x,y+climbBob,58,h);
    if(p.climbing){
      const reach=Math.sin(time/105), cx=x+29, shoulder=yy+18;
      ctx.lineCap="round";ctx.lineWidth=5;ctx.strokeStyle="#e4d6bb";ctx.beginPath();ctx.moveTo(cx-2,shoulder);ctx.lineTo(cx-14,shoulder-12-reach*8);ctx.moveTo(cx+3,shoulder+5);ctx.lineTo(cx+15,shoulder-2+reach*8);ctx.stroke();
      ctx.fillStyle="#9e634b";ctx.beginPath();ctx.arc(cx-14,shoulder-12-reach*8,3.5,0,Math.PI*2);ctx.arc(cx+15,shoulder-2+reach*8,3.5,0,Math.PI*2);ctx.fill();
    }
  }
  else{ctx.fillStyle="#27483a";ctx.fillRect(x+8,yy+19,31,34);ctx.fillStyle="#bd8769";ctx.beginPath();ctx.arc(x+24,yy+13,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#332a23";ctx.fillRect(x+10,yy+3,28,8);}
  if(!p.grounded&&!p.climbing){ctx.globalAlpha=Math.min(ctx.globalAlpha,.28);ctx.fillStyle="#080c0b";ctx.beginPath();ctx.ellipse(x+29,FLOOR_Y[p.floor]!-3,20,5,0,0,Math.PI*2);ctx.fill();}
  if(carrying){const carryX=x+(p.face>0?47:11),carryY=yy+21+Math.sin(time/120)*2;ctx.globalAlpha=1;ctx.fillStyle="#17231f";ctx.beginPath();ctx.arc(carryX,carryY,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f0d4aa";ctx.lineWidth=2;ctx.stroke();ctx.font="24px Arial";ctx.textAlign="center";ctx.fillText(carrying,carryX,carryY+8);}ctx.restore();
}
export function movePlayer(p: Body, keys: Set<string>, dt: number, worldW: number, jump: boolean) {
  const left=keys.has("a")||keys.has("arrowleft"), right=keys.has("d")||keys.has("arrowright"), up=keys.has("w")||keys.has("arrowup"), down=keys.has("s")||keys.has("arrowdown");
  if(p.climbing){
    const here=p.floor, upper=here+1, lower=here-1;
    if(up&&p.ladderTargetFloor===lower)p.ladderTargetFloor=here;
    if(down&&p.ladderTargetFloor===upper)p.ladderTargetFloor=here;
    const target=p.ladderTargetFloor??here, targetY=FLOOR_Y[target]!-57, direction=Math.sign(targetY-p.y);
    const input=up?-1:down?1:0;
    if(input===direction&&direction!==0)p.y+=input*185*dt;
    p.x=(p.ladderX??p.x+29)-29;p.vx=0;p.vy=0;p.grounded=false;p.duck=false;
    if((direction<0&&p.y<=targetY)||(direction>0&&p.y>=targetY)){
      p.y=targetY;p.floor=target;p.grounded=true;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;
    }
  } else {
    const dir=(right?1:0)-(left?1:0);if(dir){p.face=dir;p.walk+=dt*12;}p.duck=down&&p.grounded;
    p.vx += dir*(p.duck?1100:1850)*dt;if(!dir)p.vx*=Math.exp(-8*dt);p.vx=clamp(p.vx,-(p.duck?125:300),p.duck?125:300);p.x=clamp(p.x+p.vx*dt,20,worldW-58);
    if(up||down){const ladderIndex=up?p.floor:p.floor-1;const ladder=LADDERS[ladderIndex];if(ladder!==undefined&&Math.abs(p.x+29-ladder)<52){p.climbing=true;p.grounded=false;p.vx=0;p.x=ladder-29;p.ladderX=ladder;p.ladderTargetFloor=p.floor+(up?1:-1);}}
    if(jump&&p.grounded&&!p.climbing){p.vy=-470;p.grounded=false;}
    const oldY=p.y;
    p.vy+=1700*dt;p.y+=p.vy*dt;
    if(p.vy<0){
      for(let i=0;i<FLOOR_Y.length;i++){
        const surface=FLOOR_Y[i]!, span=WALKWAYS[i]!.spans.some(([a,b])=>p.x+47>=a&&p.x+11<=b);
        if(span&&oldY>=surface&&p.y<surface){p.y=surface+1;p.vy=0;break;}
      }
    }
    p.grounded=false;
    if(p.vy>=0){
      for(let i=0;i<FLOOR_Y.length;i++){
        const target=FLOOR_Y[i]!-57, overlaps=WALKWAYS[i]!.spans.some(([a,b])=>p.x+47>=a&&p.x+11<=b);
        if(overlaps&&oldY<=target&&p.y>=target){p.y=target;p.vy=0;p.grounded=true;p.floor=i;break;}
      }
    }
  }
  p.hurt=Math.max(0,p.hurt-dt);
}
function hud(root: HTMLElement, id: string, text: string) { const el=root.querySelector<HTMLElement>(`#${id}`); if(el)el.textContent=text; }
function gameClock(seconds: number) { const whole=Math.max(0,Math.ceil(seconds));return `${Math.floor(whole/60).toString().padStart(2,"0")}:${(whole%60).toString().padStart(2,"0")}`; }
export function canFinishInvisibleLoad(choresDone:number,playBreaks:number,carePending:boolean,accidentPending:boolean) { return choresDone>=8&&playBreaks>=3&&!carePending&&!accidentPending; }
export function careWindowExpired(elapsed:number,deadline:number,pickedUp:boolean) { return !pickedUp&&elapsed>=deadline; }
export function choreCanBeUndone(undoCount:number) { return undoCount<3; }
function outcome(host: Host, text: string, win: boolean, onWin?: () => void, retry?: () => void) {
  const box=document.createElement("div");box.className="toybox-outcome";box.innerHTML=`<div class="eyebrow">${win?"ROUND COMPLETE":"ONE MORE TRY"}</div><h2>${text}</h2><p>${win?"You made it through the whole scaffold, one careful step at a time.":"Take a breath. Your story is safe; this challenge can be tried again when you’re ready."}</p>${win?`<button class="btn" id="platform-outcome">Back to the story</button>`:`<div class="outcome-actions"><button class="btn" data-retry>Try this challenge again</button><button class="btn secondary" data-quit>Back to the story</button></div>`}`;host.root.querySelector(".platform-game")!.appendChild(box);if(win){box.querySelector("button")!.addEventListener("click",()=>{box.remove();host.close();onWin?.();});}else{box.querySelector<HTMLButtonElement>("[data-retry]")!.addEventListener("click",()=>{box.remove();retry?.();});box.querySelector<HTMLButtonElement>("[data-quit]")!.addEventListener("click",()=>{box.remove();host.close();});}
}
function defeat(host: Host, text: string, retry: () => void) {
  const box=document.createElement("div");box.className="toybox-outcome";box.innerHTML=`<div class="eyebrow">OUT OF HEARTS</div><h2>${text}</h2><p>Your hearts are gone. Choose when you’re ready.</p><div class="outcome-actions"><button class="btn" data-retry>Retry this boss</button><button class="btn secondary" data-quit>Quit to the story</button></div>`;
  host.root.querySelector(".platform-game")!.appendChild(box);
  box.querySelector<HTMLButtonElement>("[data-retry]")!.onclick=()=>{box.remove();retry();};
  box.querySelector<HTMLButtonElement>("[data-quit]")!.onclick=()=>{box.remove();host.close();};
}

export function toyboxPlatformer(host: Host, onWin: () => void) {
  const items=["🧸","🧱","⚽","🚂","📚","🪀","🧩","🦕","🪁","🪇","🚗","🎨","🧸","🚂","⚽"];
  const toyLanes=[[100,420,740,1080,1430],[110,470,620,1000,1360],[100,500,840,1360,1570],[110,550,700,1050,1480]];
  const toys=items.map((icon,i)=>{const floor=Math.floor(i/4),x=toyLanes[floor]![i%4]!;return{icon,x,floor,done:false,initialX:x};});
  const hazards=[{x:420,floor:1,dir:1,speed:52,label:"PHONE",icon:"▣",cool:0},{x:1080,floor:2,dir:-1,speed:44,label:"TV",icon:"▰",cool:0},{x:1430,floor:3,dir:1,speed:48,label:"PHONE",icon:"▣",cool:0},{x:760,floor:1,dir:-1,speed:40,label:"TV",icon:"▰",cool:0}], hazardStarts=hazards.map(h=>({x:h.x,dir:h.dir}));
  page(host.root,"Operation: floor patrol","Beautiful Chaos · the living room, after bedtime","Fifteen toys. Four scaffold levels. Get each toy back to the green chest before the house wakes up.","toy-leave","toy-canvas",`<span>TIME <b id="toy-time">04:30</b></span><span id="toy-count">TOYS 0 / 15</span><span id="toy-carry">HANDS FREE</span><span id="toy-feedback">WATCH THE RED DISTRACTIONS</span>`,`Walk up to a toy and press E. Carry it to the green toy chest on the bottom floor; press E there to drop it off.`);
  const app=begin(host,"toy-leave","toy-canvas"), p:Body={x:110,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};const roomArt=new Image();roomArt.src="/assets/realm-3-toy-room.png";
  let left=270, carry=-1, invul=0, hitFlash=0, hitText="", ended=false, message="", msgTime=0; app.last(performance.now());
  const reset=()=>{toys.forEach(t=>{t.done=false;t.x=t.initialX;});hazards.forEach((h,i)=>{h.x=hazardStarts[i]!.x;h.dir=hazardStarts[i]!.dir;h.cool=0;});left=270;carry=-1;invul=0;hitFlash=0;hitText="";ended=false;p.x=110;p.y=FLOOR_Y[0]!-57;p.floor=0;p.grounded=true;p.vy=0;p.hurt=0;hud(host.root,"toy-feedback","WATCH THE RED DISTRACTIONS");app.last(performance.now());};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!ended){left-=dt;movePlayer(p,app.keys,dt,1680,acts.jump);invul=Math.max(0,invul-dt);hitFlash=Math.max(0,hitFlash-dt);msgTime=Math.max(0,msgTime-dt);if(msgTime===0)hud(host.root,"toy-feedback","WATCH THE RED DISTRACTIONS");
      if(acts.use){if(carry>=0){const chest=Math.abs(p.x-92)<78&&p.floor===0;if(chest){toys[carry]!.done=true;carry=-1;message="Into the box. One less thing to trip over.";msgTime=2.1;hud(host.root,"toy-feedback",message);}else{message="The green chest is back on the bottom floor.";msgTime=2;hud(host.root,"toy-feedback",message);}}else{const idx=toys.findIndex(t=>!t.done&&t.floor===p.floor&&Math.abs(t.x-p.x)<58);if(idx>=0){carry=idx;message="Got it. Back down to the green chest.";msgTime=2;hud(host.root,"toy-feedback",message);}}}
      for(const h of hazards){h.x+=h.dir*h.speed*dt;if(h.x<80||h.x>1600)h.dir*=-1;h.cool=Math.max(0,h.cool-dt);const same=p.floor===h.floor&&Math.abs(p.x+23-h.x)<34&&p.y+52>FLOOR_Y[h.floor]!-66&&p.y+10<FLOOR_Y[h.floor]!-24&&!p.duck;if(same&&invul===0&&h.cool===0){const before=left;left=Math.max(0,left-30);invul=1.15;hitFlash=1.15;p.hurt=1.15;h.cool=1.4;if(carry>=0){const t=toys[carry]!;t.x=t.initialX;carry=-1;}p.vx=p.x<h.x?-240:240;p.vy=-250;p.grounded=false;hitText=`${gameClock(before)} → ${gameClock(left)}`;message=`HIT! −30 SECONDS · ${hitText}`;msgTime=2.3;hud(host.root,"toy-feedback",message);host.toast("Hit! 30 seconds off. Aaron flashes while he recovers; the toy dropped back where you found it.");}}
      const count=toys.filter(t=>t.done).length;hud(host.root,"toy-count",`TOYS ${count} / 15`);hud(host.root,"toy-time",gameClock(left));hud(host.root,"toy-carry",carry>=0?`CARRYING ${toys[carry]!.icon}`:"HANDS FREE");if(count===15){ended=true;outcome(host,"Every toy made it home.",true,onWin);}else if(left<=0){ended=true;outcome(host,"The kids heard something.",false,undefined,reset);}}
    const cam=clamp(p.x-W*.48,0,720);drawWorld(app.ctx,cam,time,"15 TOYS · 4 LEVELS · GREEN CHEST BELOW",roomArt,.22);const ctx=app.ctx;
    const bx=92-cam, by=FLOOR_Y[0]!-50;ctx.save();ctx.shadowColor="#6cff9b";ctx.shadowBlur=25;ctx.strokeStyle="#7af3a4";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(bx,by,57+Math.sin(time/230)*4,42,0,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle="#285943";ctx.fillRect(bx-36,by-25,72,42);ctx.fillStyle="#98ffc0";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText("TOY CHEST",bx,by-35);
    toys.forEach((t,i)=>{if(t.done||i===carry)return;const x=t.x-cam,y=FLOOR_Y[t.floor]!-28;if(x<-30||x>W+30)return;ctx.fillStyle="#f4e2c2";ctx.beginPath();ctx.ellipse(x,y+10,23,8,0,0,Math.PI*2);ctx.fill();ctx.font="27px Arial";ctx.textAlign="center";ctx.fillText(t.icon,x,y+8);});
    hazards.forEach(h=>{const x=h.x-cam,y=FLOOR_Y[h.floor]!-42;if(x<-50||x>W+50)return;ctx.save();ctx.fillStyle="#4a1528";ctx.strokeStyle="#ff6879";ctx.lineWidth=2;ctx.shadowColor="#ff304e";ctx.shadowBlur=8;ctx.beginPath();ctx.roundRect(x-23,y-15,46,30,8);ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle="#fff3df";ctx.textAlign="center";ctx.font="bold 9px Arial";ctx.fillText(h.label,x,y-4);ctx.font="15px Arial";ctx.fillText(h.icon,x,y+11);});
    drawAaron(ctx,app.hero,p,cam,time,carry>=0?toys[carry]!.icon:"");if(hitFlash>0){ctx.save();ctx.globalAlpha=Math.min(1,hitFlash*1.2);ctx.fillStyle="#691b32ee";ctx.strokeStyle="#ff8390";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(W/2-154,22,308,70,14);ctx.fill();ctx.stroke();ctx.textAlign="center";ctx.font="bold 24px Arial";ctx.fillStyle="#fff3d8";ctx.shadowColor="#ff304e";ctx.shadowBlur=14;ctx.fillText("−30 SECONDS",W/2,53);ctx.shadowBlur=0;ctx.font="bold 13px Arial";ctx.fillText(`TIME ${hitText} · TOY DROPPED`,W/2,76);ctx.restore();}app.next(draw);
  };app.next(draw);
}

export function midnightPlatformer(host: Host, onWin: () => void) {
  const sunriseSeconds = 360;
  page(host.root,"The Midnight Marathon","Beautiful Chaos · 2:13 a.m.","All three kids are already roaming the scaffold. Bring each one to their bedroom before sunrise; a loud bump can wake someone you just tucked in.","night-leave","night-canvas",`<span>UNTIL SUNRISE <b id="night-time">06:00</b></span><span id="night-stage">IN BED · 0 / 3</span><span id="night-carry">HANDS FREE</span><span id="night-goal">THE KIDS ARE UP · FIND ONE</span>`,`Walk the four scaffold levels with A / D. Climb at each ladder with ↑ or ↓, jump with Space, duck with S, and press E near a child to pick them up. Beds: Naomi · top-left; Matthew · third-floor right; Maliyah · second-floor left. Get all three settled before the sunrise timer reaches zero.`);
  const app=begin(host,"night-leave","night-canvas"),p:Body={x:760,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};
  const childSprites=["naomi","matthew","maliyah"].map(name=>{const img=new Image();img.src=`/assets/characters/children-${name}-growth.png`;return img;});
  const nightArt=new Image();nightArt.src="/assets/realm-3-home.jpg";
  const rooms=[{name:"NAOMI’S ROOM",floor:3,x:110,icon:"N"},{name:"MATTHEW’S ROOM",floor:2,x:1450,icon:"M"},{name:"MALIYAH’S ROOM",floor:1,x:110,icon:"B"}];
  type NightKid={id:number;x:number;floor:number;targetX:number;targetFloor:number;dir:number;asleep:boolean;climbTo?:number;climbT:number};
  const kids:NightKid[]=[
    {id:0,x:690,floor:3,targetX:1410,targetFloor:1,dir:1,asleep:false,climbT:0},
    {id:1,x:1330,floor:2,targetX:210,targetFloor:0,dir:-1,asleep:false,climbT:0},
    {id:2,x:1120,floor:1,targetX:1480,targetFloor:3,dir:1,asleep:false,climbT:0},
  ];
  const hazards=[
    {x:330,floor:0,label:"SQUEAKY TOY",icon:"🧸",dir:1,speed:43,lo:130,hi:510,cool:0},
    {x:1110,floor:0,label:"PHONE",icon:"▣",dir:-1,speed:52,lo:880,hi:1430,cool:0},
    {x:420,floor:1,label:"LAMP SWITCH",icon:"☼",dir:1,speed:44,lo:250,hi:700,cool:0},
    {x:1300,floor:1,label:"TOY TRUCK",icon:"🚗",dir:-1,speed:58,lo:1040,hi:1530,cool:0},
    {x:820,floor:2,label:"BUZZING PHONE",icon:"▣",dir:1,speed:47,lo:640,hi:1110,cool:0},
    {x:250,floor:2,label:"SQUEAKY TOY",icon:"🧸",dir:-1,speed:39,lo:100,hi:430,cool:0},
    {x:1130,floor:3,label:"TV CLICKER",icon:"▰",dir:1,speed:51,lo:940,hi:1370,cool:0},
    {x:320,floor:3,label:"LIGHT SWITCH",icon:"☼",dir:-1,speed:42,lo:120,hi:620,cool:0},
    {x:730,floor:1,label:"PHONE",icon:"▣",dir:1,speed:55,lo:650,hi:980,cool:0},
    {x:1330,floor:2,label:"TOY TRUCK",icon:"🚂",dir:-1,speed:48,lo:1120,hi:1550,cool:0},
  ];
  const hazardStarts=hazards.map(h=>({x:h.x,dir:h.dir}));
  let carry=-1,left=sunriseSeconds,ended=false,cooldown=0,warning="The kids are already up. Find one and get them home.";
  let cryContext:AudioContext|null=null;
  const playWakeCry=()=>{
    try{
      cryContext??=new AudioContext();
      if(cryContext.state==="suspended")void cryContext.resume();
      const ctx=cryContext,base=ctx.currentTime;
      for(let i=0;i<2;i++){
        const at=base+i*.34,osc=ctx.createOscillator(),gain=ctx.createGain(),vibrato=ctx.createOscillator(),vibratoGain=ctx.createGain();
        osc.type="triangle";osc.frequency.setValueAtTime(560,at);osc.frequency.linearRampToValueAtTime(760,at+.13);osc.frequency.linearRampToValueAtTime(520,at+.34);
        vibrato.frequency.value=6;vibratoGain.gain.value=19;vibrato.connect(vibratoGain);vibratoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(.001,at);gain.gain.linearRampToValueAtTime(.085,at+.06);gain.gain.setValueAtTime(.07,at+.22);gain.gain.exponentialRampToValueAtTime(.001,at+.36);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.37);vibrato.start(at);vibrato.stop(at+.37);
      }
    }catch{host.toast("A kid woke up. Keep an eye on the bedrooms.");}
  };
  const reset=()=>{
    carry=-1;left=sunriseSeconds;ended=false;cooldown=0;warning="The kids are already up. Find one and get them home.";
    kids.forEach((k,i)=>{k.asleep=false;k.climbTo=undefined;k.climbT=0;k.x=[690,1330,1120][i]!;k.floor=[3,2,1][i]!;k.targetX=[1410,210,1480][i]!;k.targetFloor=[1,0,3][i]!;k.dir=1;});
    hazards.forEach((h,i)=>{h.x=hazardStarts[i]!.x;h.dir=hazardStarts[i]!.dir;h.cool=0;});
    p.x=760;p.y=FLOOR_Y[0]!-57;p.floor=0;p.vx=p.vy=0;p.grounded=true;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;p.hurt=0;app.last(performance.now());playWakeCry();
  };
  const chooseWander=(kid:NightKid)=>{kid.targetFloor=Math.floor(Math.random()*FLOOR_Y.length);kid.targetX=100+Math.random()*1480;if(kid.targetFloor===kid.floor&&Math.abs(kid.targetX-kid.x)<220)kid.targetX=kid.x<840?1450:180;};
  const moveKid=(kid:NightKid,dt:number)=>{
    if(kid.asleep||carry===kid.id)return;
    const speed=45+kid.id*6;
    if(kid.climbTo!==undefined){kid.climbT=Math.min(1,kid.climbT+dt*1.35);if(kid.climbT>=1){kid.floor=kid.climbTo;kid.climbTo=undefined;kid.climbT=0;}return;}
    if(kid.floor!==kid.targetFloor){const ladderIndex=kid.floor<kid.targetFloor?kid.floor:kid.floor-1;const ladder=LADDERS[ladderIndex]!;const dx=ladder-kid.x;if(Math.abs(dx)<12){kid.x=ladder;kid.climbTo=kid.floor+(kid.floor<kid.targetFloor?1:-1);kid.climbT=0;}else{kid.dir=Math.sign(dx);kid.x+=kid.dir*speed*dt;}return;}
    const dx=kid.targetX-kid.x;if(Math.abs(dx)<16){chooseWander(kid);return;}kid.dir=Math.sign(dx);kid.x+=kid.dir*speed*dt;
  };
  const childBaseline=(kid:NightKid)=>kid.climbTo===undefined?FLOOR_Y[kid.floor]!-2:FLOOR_Y[kid.floor]!+(FLOOR_Y[kid.climbTo]!-FLOOR_Y[kid.floor]!)*kid.climbT-2;
  const drawChild=(ctx:CanvasRenderingContext2D,kid:NightKid,x:number,baseline:number,cam:number,time:number)=>{
    const img=childSprites[kid.id]!,screenX=x-cam;
    if(img.complete&&img.naturalWidth){const frame=kid.id===0?2:1;const sway=Math.sin(time/135+kid.id)*2;ctx.drawImage(img,frame*512,0,512,1024,screenX-22,baseline-76+sway,44,76);}
    else{ctx.font="33px Arial";ctx.textAlign="center";ctx.fillText(kid.id===0?"👧🏾":kid.id===1?"👦🏾":"👶🏾",screenX,baseline-12);}
  };
  const interact=()=>{
    if(ended)return;
    if(carry>=0){
      const room=rooms[carry]!,kid=kids[carry]!;
      if(p.floor===room.floor&&Math.abs(p.x-room.x)<74){kid.asleep=true;kid.x=room.x;kid.floor=room.floor;kid.targetX=room.x;kid.targetFloor=room.floor;kid.climbTo=undefined;carry=-1;warning=`${room.name} · softly closed.`;host.toast(`${kid.id===0?"Naomi":kid.id===1?"Matthew":"Maliyah"} is tucked in.`);if(kids.every(k=>k.asleep)){ended=true;outcome(host,"Three quiet rooms. You made it to sunrise.",true,onWin);}}
      else warning=`Take them to ${room.name.toLowerCase()}.`;
    }else{
      const kid=kids.filter(k=>!k.asleep&&k.climbTo===undefined).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)).find(k=>k.floor===p.floor&&Math.abs(k.x-p.x)<74);
      if(kid){carry=kid.id;kid.dir=p.x<kid.x?-1:1;warning=`Carry them upstairs to ${rooms[kid.id]!.name.toLowerCase()}.`;}
      else warning="Get close to one of the kids, then press E to pick them up.";
    }
    hud(host.root,"night-goal",warning);
  };
  playWakeCry();
  const draw=(time:number)=>{
    const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();
    if(!ended){
      left-=dt;cooldown=Math.max(0,cooldown-dt);movePlayer(p,app.keys,dt,1680,acts.jump);kids.forEach(k=>moveKid(k,dt));if(acts.use)interact();
      for(const n of hazards){n.x+=n.dir*n.speed*dt;if(n.x<n.lo||n.x>n.hi)n.dir*=-1;n.cool=Math.max(0,n.cool-dt);const hit=p.floor===n.floor&&Math.abs(p.x+29-n.x)<34&&p.y+52>FLOOR_Y[n.floor]!-67&&p.y+12<FLOOR_Y[n.floor]!-20&&!p.duck&&p.hurt<=0;
        if(hit&&cooldown===0&&n.cool===0){left=Math.max(0,left-18);cooldown=1.05;n.cool=1.5;p.hurt=.8;p.vx=p.x<n.x?-200:200;p.vy=-150;p.grounded=false;
          const sleeping=kids.filter(k=>k.asleep);
          const woken=sleeping.length?sleeping[Math.floor(Math.random()*sleeping.length)]!:undefined;
          if(woken){woken.asleep=false;woken.climbTo=undefined;woken.climbT=0;woken.x=rooms[woken.id]!.x+(rooms[woken.id]!.x<700?145:-145);woken.floor=rooms[woken.id]!.floor;chooseWander(woken);playWakeCry();warning=`${n.label}! ${woken.id===0?"Naomi":woken.id===1?"Matthew":"Maliyah"} is wandering again.`;host.toast(`${n.label.toLowerCase()} woke ${woken.id===0?"Naomi":woken.id===1?"Matthew":"Maliyah"}.`);}
          else{warning=`${n.label}! Easy—keep moving.`;host.toast(`${n.label.toLowerCase()} cost 18 seconds. Watch your step.`);}
        }
      }
      if(left<=0&&!kids.every(k=>k.asleep)){ended=true;outcome(host,"Sunrise found three very awake kids.",false,reset);}
    }
    const cam=clamp(p.x-W*.48,0,720),ctx=app.ctx;drawWorld(ctx,cam,time,"BEDTIME · FOUR FLOORS · SUNRISE IS COMING",nightArt,.44);ctx.textAlign="center";
    rooms.forEach((r,i)=>{const x=r.x-cam,y=FLOOR_Y[r.floor]!-50;ctx.fillStyle=kids[i]!.asleep?"#23372d":"#32232d";ctx.fillRect(x-66,y-38,132,45);ctx.strokeStyle=kids[i]!.asleep?"#91d4a0":"#e4b784";ctx.lineWidth=3;ctx.strokeRect(x-66,y-38,132,45);ctx.fillStyle="#ffebcd";ctx.font="bold 10px Arial";ctx.fillText(r.name,x,y-20);ctx.font="21px Arial";ctx.fillText(kids[i]!.asleep?"💤":"🛏️",x,y+2);});
    hazards.forEach(n=>{const x=n.x-cam,y=FLOOR_Y[n.floor]!-45;if(x<-45||x>W+45)return;ctx.save();ctx.fillStyle="#432d35";ctx.strokeStyle="#ffb56e";ctx.lineWidth=2;ctx.shadowColor="#ff9b62";ctx.shadowBlur=8;ctx.beginPath();ctx.roundRect(x-22,y-14,44,28,7);ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle="#fff0d5";ctx.font="bold 8px Arial";ctx.fillText(n.label,x,y-19);ctx.font="15px Arial";ctx.fillText(n.icon,x,y+7);});
    kids.forEach(k=>{if(k.asleep||carry===k.id)return;const baseline=childBaseline(k),x=k.x-cam;drawChild(ctx,k,k.x,baseline,cam,time);ctx.fillStyle="#fff4da";ctx.font="bold 9px Arial";ctx.fillText(`E · ${k.id===0?"NAOMI":k.id===1?"MATTHEW":"MALIYAH"}`,x,baseline-82);});
    kids.forEach(k=>{if(k.asleep){const r=rooms[k.id]!,x=r.x-cam;ctx.fillStyle="#d9f0c6";ctx.font="bold 13px Arial";ctx.fillText("z z z",x+38,FLOOR_Y[r.floor]!-104);}});
    drawAaron(ctx,app.hero,p,cam,time);if(carry>=0)drawChild(ctx,kids[carry]!,p.x+48,p.y+38,cam,time);
    const timeLeft=Math.max(0,left);hud(host.root,"night-time",`${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${Math.max(0,Math.ceil(timeLeft%60)).toString().padStart(2,'0')}`);hud(host.root,"night-stage",`IN BED · ${kids.filter(k=>k.asleep).length} / 3`);hud(host.root,"night-carry",carry>=0?`CARRYING ${rooms[carry]!.name}`:"HANDS FREE");hud(host.root,"night-goal",warning);app.next(draw);
  };app.next(draw);
}

type Foe={x:number;floor:number;name:string;hp:number;dir:number;shot:number;kind:string};
export function breakupBossPlatformer(host: Host, onWin: () => void) {
  page(host.root,"The First Break · climb through the noise","The Beginning · BOSS FIGHT","The breakup is the boss of this chapter. Climb the scaffold, swat away fear and bad timing, and make it to Raiven at the top.","breakup-leave","breakup-canvas",`<span id="breakup-health">♥ ♥ ♥ ♥ ♥</span><span id="breakup-foes">FEARS 0 / 4</span><span id="breakup-status">CLIMB TO THE TOP</span>`,`J swats a nearby fear. Jump or duck under the words they throw. A hit costs one heart; the ladders connect every level.`);
  const app=begin(host,"breakup-leave","breakup-canvas"),p:Body={x:100,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};const breakupArt=new Image();breakupArt.src="/assets/realm-1-park-side.png";const raiven=new Image();raiven.src="/assets/characters/raiven-wedding-dialogue.png";
  const foes:Foe[]=[{x:600,floor:0,name:"BAD TIMING",hp:2,dir:-1,shot:1.15,kind:"clock"},{x:1020,floor:1,name:"WHAT IF?",hp:2,dir:1,shot:1.7,kind:"question"},{x:460,floor:2,name:"UNSAID WORDS",hp:2,dir:-1,shot:2.25,kind:"paper"},{x:1040,floor:3,name:"DOUBT",hp:4,dir:1,shot:2.8,kind:"doubt"}];
  const heartPickups=[{x:280,floor:1,collected:false},{x:1330,floor:2,collected:false},{x:1370,floor:3,collected:false}];
  let hp=5, cooldown=0, attackCd=0, swing=0, won=false, defeated=false, message="Move to a ladder and press ↑. Climb back down with ↓."; const projectiles:{x:number;y:number;floor:number;vx:number;glyph:string}[]=[];
  const foeStarts=foes.map(f=>({x:f.x,hp:f.hp,dir:f.dir,shot:f.shot}));
  const retry=()=>{hp=5;cooldown=0;attackCd=0;swing=0;won=false;defeated=false;message="Move to a ladder and press ↑. Climb back down with ↓.";p.x=100;p.y=FLOOR_Y[0]!-57;p.vx=0;p.vy=0;p.floor=0;p.grounded=true;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;p.hurt=0;foes.forEach((f,i)=>{const start=foeStarts[i]!;f.x=start.x;f.hp=start.hp;f.dir=start.dir;f.shot=start.shot;});heartPickups.forEach(h=>h.collected=false);projectiles.length=0;app.last(performance.now());};
  const takeHit=(fromX:number,label:string)=>{if(cooldown>0||defeated)return;hp=Math.max(0,hp-1);cooldown=1.15;p.hurt=1.15;p.vx=(p.x+29<fromX?-1:1)*220;p.vy=-190;p.grounded=false;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;message=`${label} · ${hp} ${hp===1?"heart":"hearts"} left`;host.toast(message);if(hp===0){defeated=true;p.vx=0;defeat(host,"The climb got away from you.",retry);}};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!won&&!defeated){movePlayer(p,app.keys,dt,1680,acts.jump);cooldown=Math.max(0,cooldown-dt);attackCd=Math.max(0,attackCd-dt);swing=Math.max(0,swing-dt);
      if(acts.attack&&attackCd===0){attackCd=.32;swing=.2;for(const f of foes){if(f.hp>0&&f.floor===p.floor&&Math.abs(f.x-(p.x+23))<105){f.hp--;message=`SWAT! ${f.name} loses ground.`;host.toast(message);break;}}}
  foes.forEach(f=>{if(!f.hp)return;f.x+=f.dir*(34+f.floor*5)*dt;if(f.x<60||f.x>1620)f.dir*=-1;f.shot-=dt;if(f.shot<=0){f.shot=1.45+Math.random()*.45;projectiles.push({x:f.x,y:FLOOR_Y[f.floor]!-64,floor:f.floor,vx:p.x>f.x?105:-105,glyph:f.kind==="paper"?"✉":"!"});}});
      for(const h of heartPickups){if(!h.collected&&hp<5&&p.floor===h.floor&&Math.abs(p.x-h.x)<48&&Math.abs(p.y-(FLOOR_Y[h.floor]!-57))<24){h.collected=true;hp=Math.min(5,hp+1);message="A little courage back · +1 heart";host.toast("Heart found · one heart restored.");}}
      for(let i=projectiles.length-1;i>=0;i--){const q=projectiles[i]!;q.x+=q.vx*dt;const same=q.floor===p.floor&&Math.abs(q.x-(p.x+29))<26&&Math.abs(q.y-(p.y+25))<38&&!p.duck;if(same&&cooldown===0){takeHit(q.x,"A thrown doubt caught you");projectiles.splice(i,1);}else if(q.x<0||q.x>1680)projectiles.splice(i,1);}
      for(const f of foes){const overlapsY=p.y+48>FLOOR_Y[f.floor]!-90&&p.y<FLOOR_Y[f.floor]!-32;if(f.hp&&f.floor===p.floor&&Math.abs(f.x-(p.x+29))<39&&overlapsY&&cooldown===0){takeHit(f.x,f.name);break;}}
      if(!defeated&&foes.every(f=>f.hp===0)&&p.floor===3&&p.x>1540&&!won){won=true;hud(host.root,"breakup-status","SHE’S RIGHT THERE");outcome(host,"You reached Raiven at the top.",true,onWin);}}
    const cam=clamp(p.x-W*.48,0,720),ctx=app.ctx;drawWorld(ctx,cam,time,"BOSS · THE FIRST BREAK · REACH RAIVEN",breakupArt,.52);
    foes.forEach(f=>{if(!f.hp)return;const x=f.x-cam,y=FLOOR_Y[f.floor]!-58;ctx.save();ctx.translate(x,y);ctx.fillStyle=f.name==="DOUBT"?"#4c2545":"#574043";ctx.strokeStyle=f.name==="DOUBT"?"#e29cc1":"#f1ad79";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,20);ctx.lineTo(-20,-14);ctx.lineTo(-10,-34);ctx.lineTo(13,-34);ctx.lineTo(25,-8);ctx.lineTo(22,20);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#fff0d1";ctx.beginPath();ctx.arc(-7,-20,3,0,Math.PI*2);ctx.arc(8,-20,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ffd6ad";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-2);ctx.lineTo(10,-7);ctx.moveTo(-20,4);ctx.lineTo(-35,14);ctx.moveTo(18,3);ctx.lineTo(33,12);ctx.stroke();ctx.restore();ctx.fillStyle="#fff0d7";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(f.name,x,y-46);ctx.fillStyle="#321e27";ctx.fillRect(x-26,y-39,52,5);ctx.fillStyle="#e89783";ctx.fillRect(x-26,y-39,52*(f.hp/(f.name==="DOUBT"?4:2)),5);});
    projectiles.forEach(q=>{ctx.font="bold 24px Arial";ctx.textAlign="center";ctx.fillStyle="#ffe1a5";ctx.shadowColor="#ffbf69";ctx.shadowBlur=10;ctx.fillText(q.glyph,q.x-cam,FLOOR_Y[q.floor]!-57);ctx.shadowBlur=0;});
    heartPickups.forEach(h=>{if(h.collected)return;const x=h.x-cam,y=FLOOR_Y[h.floor]!-58;ctx.save();ctx.shadowColor="#ff8f9a";ctx.shadowBlur=18;ctx.fillStyle="#f27b8b";ctx.font="bold 31px Arial";ctx.textAlign="center";ctx.fillText("♥",x,y);ctx.restore();ctx.fillStyle="#fff0dc";ctx.font="bold 9px Arial";ctx.fillText("EXTRA HEART",x,y-23);});
    const rx=1600-cam,top=FLOOR_Y[3]!-58,cellX=rx-70,cellY=top-88;ctx.fillStyle="#201d22";ctx.fillRect(cellX,cellY,58,106);if(raiven.complete&&raiven.naturalWidth){ctx.drawImage(raiven,cellX+2,cellY+3,54,88);}ctx.strokeStyle="#d7bb8a";ctx.lineWidth=3;ctx.strokeRect(cellX,cellY,58,106);ctx.beginPath();for(let bx=cellX+10;bx<cellX+58;bx+=13){ctx.moveTo(bx,cellY);ctx.lineTo(bx,cellY+106);}ctx.stroke();ctx.fillStyle="#fff0ce";ctx.font="bold 11px Georgia";ctx.textAlign="center";ctx.fillText("RAIVEN",cellX+29,cellY-7);ctx.fillStyle="#f6d487";ctx.font="bold 25px Arial";ctx.shadowColor="#ffd77f";ctx.shadowBlur=15;ctx.fillText("♥",cellX+29,cellY+52);ctx.shadowBlur=0;ctx.fillStyle="#f4d9ae";ctx.font="bold 9px Arial";ctx.fillText("THE HEARTLIGHT",cellX+29,top+30);
    drawAaron(ctx,app.hero,p,cam,time);if(swing>0){const px=p.x-cam+23,py=p.y+27,prog=1-swing/.2;ctx.save();ctx.translate(px,py);ctx.scale(p.face,1);ctx.strokeStyle="#fff2c5";ctx.lineWidth=7;ctx.lineCap="round";ctx.shadowColor="#ffe1a4";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(10,0,39,-1.4+prog*1.45,.6+prog*1.45);ctx.stroke();ctx.strokeStyle="#f2c98a";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(4,4);ctx.lineTo(38,-3+Math.sin(prog*Math.PI)*10);ctx.stroke();ctx.restore();}hud(host.root,"breakup-health",`HEARTS ${"♥ ".repeat(hp).trim()}`);hud(host.root,"breakup-foes",`FEARS ${foes.filter(f=>!f.hp).length} / 4`);hud(host.root,"breakup-status",message);app.next(draw);
  };app.next(draw);
}

export function invisibleLoadPlatformer(host: Host, onWin: () => void) {
  const dayLength=480, choreGoal=8, repeatedCareGoal=3, playGoal=3, taskGoal=choreGoal+playGoal;
  page(host.root,"The Invisible Load","Through Every Season · BOSS FIGHT","A full day at home: eight house jobs, a little time with each kid, and whatever comes up along the way.","load-leave","load-canvas",`<span>TIME <b id="load-time">08:00</b></span><span id="load-tasks">DONE 0 / ${taskGoal}</span><span id="load-care">MATTHEW 0 / 3 · MALIYAH 0 / 3</span><span id="load-urgent">NO URGENT NEED</span><span id="load-play">PLAY 0 / ${playGoal}</span><span id="load-energy">ENERGY 100%</span><span id="load-watch">CHORES AT RISK 0</span><span id="load-status">THE DAY IS ALREADY MOVING</span>`,`A / D to run · ↑ / ↓ at a ladder · Space to jump · S to duck · E to interact. E finishes a nearby job or gives a child your attention. If Matthew needs the potty or Maliyah needs a change, find that child within 10 seconds, carry them to the marked station, then press E. Missing the window means cleaning up an accident and getting the day back in order. A job the kids undo three times stays safe. Finish the house jobs and play breaks to end the day; care needs stop once you’re done.`);
  const app=begin(host,"load-leave","load-canvas"),p:Body={x:90,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};
  const homeArt=new Image();homeArt.src="/assets/realm-3-toy-room.png";
  type Chore={id:string;x:number;floor:number;name:string;icon:string;cost:number;done:boolean;undoCount:number;undoAt:number;underWatch:boolean};
  type LoadKid={id:number;name:string;x:number;floor:number;targetX:number;targetFloor:number;dir:number;climbTo?:number;climbT:number;sabotageQueue:string[]};
  const chores:Chore[]=[
    {id:"breakfast",x:350,floor:0,name:"MAKE BREAKFAST",icon:"🍳",cost:9,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"outing",x:1200,floor:0,name:"PACK THE BAG",icon:"🎒",cost:8,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"dishes",x:250,floor:1,name:"WASH THE DISHES",icon:"🍽️",cost:10,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"entry",x:1020,floor:1,name:"CLEAR THE ENTRY",icon:"👟",cost:8,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"laundry",x:180,floor:2,name:"FOLD THE LAUNDRY",icon:"🧺",cost:10,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"homework",x:870,floor:2,name:"HOMEWORK + BOOKS",icon:"📚",cost:8,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"bath",x:250,floor:3,name:"BATH + BEDTIME",icon:"🛁",cost:11,done:false,undoCount:0,undoAt:0,underWatch:false},
    {id:"dinner",x:1100,floor:3,name:"DINNER + CLEANUP",icon:"🥣",cost:10,done:false,undoCount:0,undoAt:0,underWatch:false},
  ];
  const toilet={x:1450,floor:1},changingMat={x:1320,floor:2};
  const coffee=[{x:600,floor:1,used:false},{x:1480,floor:3,used:false}];
  const kids:LoadKid[]=[
    {id:0,name:"Naomi",x:620,floor:0,targetX:620,targetFloor:0,dir:1,climbT:0,sabotageQueue:[]},
    {id:1,name:"Matthew",x:1180,floor:1,targetX:1180,targetFloor:1,dir:-1,climbT:0,sabotageQueue:[]},
    {id:2,name:"Maliyah",x:500,floor:2,targetX:500,targetFloor:2,dir:1,climbT:0,sabotageQueue:[]},
  ];
  const childSprites=kids.map(k=>{const image=new Image();image.src=`/assets/characters/children-${k.name.toLowerCase()}-growth.png`;return image;});
  let elapsed=0,left=dayLength,energy=100,carryKid:number|null=null,done=false,graceUsed=false,msg="Find the kids. The chores can wait one minute.",pottyDone=0,diaperDone=0,activeCare:"potty"|"diaper"|null=null,careKid:number|null=null,careDeadline=0,nextCareAt=52,careSequence=0,accidentActive=false,accidentPopupOpen=false,accidentX=0,accidentFloor=0,accidentKind:"potty"|"diaper"="potty";
  const played=[false,false,false];
  const findChore=(id:string)=>chores.find(task=>task.id===id);
  const reset=()=>{
    chores.forEach(task=>{task.done=false;task.undoCount=0;task.undoAt=0;task.underWatch=false;});
    coffee.forEach(stop=>stop.used=false);
    kids.forEach((kid,index)=>{const starts=[[620,0],[1180,1],[500,2]][index]!;kid.x=starts[0]!;kid.floor=starts[1]!;kid.targetX=kid.x;kid.targetFloor=kid.floor;kid.dir=index===1?-1:1;kid.climbTo=undefined;kid.climbT=0;kid.sabotageQueue=[];});
    played.fill(false);elapsed=0;left=dayLength;energy=100;carryKid=null;done=false;graceUsed=false;pottyDone=0;diaperDone=0;activeCare=null;careKid=null;careDeadline=0;nextCareAt=52;careSequence=0;accidentActive=false;accidentPopupOpen=false;host.root.querySelector(".load-accident-notice")?.remove();msg="Find the kids. The chores can wait one minute.";p.x=90;p.y=FLOOR_Y[0]!-57;p.floor=0;p.vx=0;p.vy=0;p.grounded=true;p.climbing=false;p.hurt=0;app.last(performance.now());
  };
  const randomFloorPoint=(floor:number)=>{const spans=WALKWAYS[floor]!.spans,[a,b]=spans[Math.floor(Math.random()*spans.length)]!;return a+35+Math.random()*Math.max(12,b-a-70);};
  const chooseTarget=(kid:LoadKid)=>{
    const taskId=kid.sabotageQueue[0],task=taskId?findChore(taskId):undefined;
    if(task){kid.targetFloor=task.floor;kid.targetX=task.x;return;}
    kid.targetFloor=Math.floor(Math.random()*FLOOR_Y.length);kid.targetX=randomFloorPoint(kid.targetFloor);
  };
  const sendKidToUndo=(task:Chore)=>{
    if(!choreCanBeUndone(task.undoCount))return;
    const available=kids.filter(kid=>kid.id!==carryKid).sort((a,b)=>a.sabotageQueue.length-b.sabotageQueue.length);
    const kid=available[0];if(!kid)return;task.underWatch=true;kid.sabotageQueue.push(task.id);if(kid.sabotageQueue.length===1)chooseTarget(kid);
  };
  const moveKid=(kid:LoadKid,dt:number)=>{
    if(carryKid===kid.id)return;
    if(activeCare&&kid.id===careKid&&kid.climbTo===undefined)return;
    if(kid.climbTo!==undefined){kid.climbT=Math.min(1,kid.climbT+dt*1.2);if(kid.climbT>=1){kid.floor=kid.climbTo;kid.climbTo=undefined;kid.climbT=0;}return;}
    let taskId=kid.sabotageQueue[0],task=taskId?findChore(taskId):undefined;
    if(task&&(!task.done||!choreCanBeUndone(task.undoCount))){kid.sabotageQueue.shift();chooseTarget(kid);taskId=kid.sabotageQueue[0];task=taskId?findChore(taskId):undefined;}
    if(task){kid.targetFloor=task.floor;kid.targetX=task.x;}
    if(kid.floor!==kid.targetFloor){const ladderIndex=kid.floor<kid.targetFloor?kid.floor:kid.floor-1,ladder=LADDERS[ladderIndex]!;const dx=ladder-kid.x;if(Math.abs(dx)<12){kid.x=ladder;kid.climbTo=kid.floor+(kid.floor<kid.targetFloor?1:-1);kid.climbT=0;}else{kid.dir=Math.sign(dx);kid.x+=kid.dir*(82+kid.id*7)*dt;}return;}
    const dx=kid.targetX-kid.x;if(Math.abs(dx)>14){kid.dir=Math.sign(dx);kid.x+=kid.dir*(82+kid.id*7)*dt;}else if(!task){chooseTarget(kid);}
    if(task&&kid.floor===task.floor&&Math.abs(kid.x-task.x)<48){
      if(elapsed>=task.undoAt){task.done=false;task.undoCount++;task.underWatch=false;kid.sabotageQueue.shift();msg=`${kid.name} undid ${task.name.toLowerCase()}. It’s back on the list.`;host.toast(`${kid.name} got into the ${task.name.toLowerCase()}. That job needs another pass.`);chooseTarget(kid);}
      else kid.x=task.x;
    }
  };
  const completeCare=(kind:"potty"|"diaper")=>{
    if(kind==="potty"){pottyDone++;msg=`Matthew made it · potty trips ${pottyDone} / ${repeatedCareGoal}.`;}
    else{diaperDone++;msg=`Maliyah is fresh again · changes ${diaperDone} / ${repeatedCareGoal}.`;}
    careSequence++;activeCare=null;careKid=null;careDeadline=0;nextCareAt=elapsed+75;
    energy=Math.max(0,energy-3);carryKid=null;host.toast(msg);
  };
  const near=(x:number,floor:number,range=70)=>p.floor===floor&&Math.abs(p.x+29-x)<range;
  const showAccidentPopup=()=>{
    accidentPopupOpen=true;
    const notice=document.createElement("div");notice.className="load-accident-notice";
    notice.innerHTML=`<div class="eyebrow">A little accident</div><h2>That happens.</h2><p>${accidentKind==="potty"?"Matthew didn’t make it to the potty in time.":"Maliyah needed a change before Aaron could reach her."} While Aaron cleaned up, the other two got back into the house jobs. The finished chores and play breaks need another pass; the story progress is safe.</p><button class="btn" type="button">Okay, I’ll clean it up</button>`;
    notice.querySelector<HTMLButtonElement>("button")!.onclick=()=>{notice.remove();accidentPopupOpen=false;msg="Clean the marked spot, then pick the day back up.";};
    host.root.querySelector(".platform-game")?.appendChild(notice);
  };
  const createAccident=()=>{
    accidentKind=activeCare||"potty";
    const child=kids.find(kid=>kid.id===careKid);
    accidentFloor=child?.floor??p.floor;
    accidentX=clamp(child?.x??p.x+70,80,1600);
    chores.forEach(task=>{task.done=false;task.underWatch=false;task.undoAt=0;});
    kids.forEach(kid=>{kid.sabotageQueue=[];});
    played.fill(false);carryKid=null;activeCare=null;careKid=null;careDeadline=0;accidentActive=true;
    msg="Accident cleanup needed · the house jobs are back on the list.";
    host.toast("Accident! Clean up, then get back to the jobs.");
    showAccidentPopup();
  };
  const interact=()=>{
    if(accidentActive){
      if(near(accidentX,accidentFloor,82)){
        accidentActive=false;completeCare(accidentKind);msg=`Cleaned up. ${accidentKind==="potty"?"Matthew’s":"Maliyah’s"} care is handled, and the house jobs are back in motion.`;host.toast("Cleanup done. Keep going—you still have time.");
      }else msg="Reach the marked cleanup spot and press E.";
      return;
    }
    if(carryKid!==null){
      if(carryKid===1&&activeCare==="potty"&&near(toilet.x,toilet.floor)){completeCare("potty");return;}
      if(carryKid===2&&activeCare==="diaper"&&near(changingMat.x,changingMat.floor)){completeCare("diaper");return;}
      msg=carryKid===1?"Carry Matthew to the bathroom on level two, then press E.":"Carry Maliyah to the changing mat on level three, then press E.";return;
    }
    if(activeCare){
      const needing=kids.find(kid=>kid.id===careKid);
      if(needing&&needing.climbTo===undefined&&needing.floor===p.floor&&Math.abs(needing.x-(p.x+29))<68){carryKid=needing.id;needing.dir=p.x<needing.x?-1:1;careDeadline=0;msg=activeCare==="potty"?"You got Matthew. Take him to the bathroom.":"You got Maliyah. Carry her to the changing mat.";host.toast(msg);}
      else{const remain=Math.max(0,Math.ceil(careDeadline-elapsed));msg=`Find ${activeCare==="potty"?"Matthew":"Maliyah"} · ${remain} seconds to reach them.`;}
      return;
    }
    const childForPlay=kids.filter(kid=>!played[kid.id]&&kid.climbTo===undefined&&kid.floor===p.floor&&Math.abs(kid.x-(p.x+29))<58).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    if(childForPlay){played[childForPlay.id]=true;left=Math.min(dayLength+135,left+25);energy=Math.min(100,energy+14);msg=`A little time together with ${childForPlay.name} · play breaks ${played.filter(Boolean).length} / ${playGoal}.`;host.toast(`${childForPlay.name} got your full attention. +25 seconds.`);return;}
    const mug=coffee.find(stop=>!stop.used&&near(stop.x,stop.floor,70));
    if(mug){mug.used=true;left=Math.min(dayLength+135,left+30);energy=Math.min(100,energy+38);msg="A quick coffee. The work is still here, but you’ve got a little more in the tank.";host.toast("Coffee break · +30 seconds and energy restored.");return;}
    const task=chores.find(item=>!item.done&&near(item.x,item.floor,64));
    if(task){task.done=true;task.undoAt=elapsed+18;energy=Math.max(0,energy-task.cost);msg=`${task.name} · done for now.`;sendKidToUndo(task);host.toast(`${task.name} finished. Little feet are already moving again.`);return;}
    msg="Get close to a child or a station, then press E.";
  };
  const drawKid=(ctx:CanvasRenderingContext2D,kid:LoadKid,cam:number,time:number,carried=false)=>{
    if(!carried&&carryKid===kid.id)return;
    const image=childSprites[kid.id]!,screenX=(carried?p.x+(p.face>0?49:9):kid.x)-cam;
    let baseline=FLOOR_Y[kid.floor]!-2;
    if(!carried&&kid.climbTo!==undefined)baseline=FLOOR_Y[kid.floor]!+(FLOOR_Y[kid.climbTo]!-FLOOR_Y[kid.floor]!)*kid.climbT-2;
    if(carried)baseline=p.y+57;
    const moving=carried||kid.climbTo!==undefined||Math.abs(kid.x-kid.targetX)>14,bob=moving?Math.abs(Math.sin(time/72+kid.id))*4:Math.sin(time/190+kid.id)*1.5;
    const frame=(kid.id===0?2:1)*512;
    if(image.complete&&image.naturalWidth){ctx.save();if(!carried&&kid.dir<0){ctx.translate(screenX,0);ctx.scale(-1,1);ctx.drawImage(image,frame,0,512,1024,-22,baseline-73+bob,44,73);}else ctx.drawImage(image,frame,0,512,1024,screenX-22,baseline-73+bob,44,73);ctx.restore();}
    else{ctx.font="34px Arial";ctx.textAlign="center";ctx.fillText(kid.id===0?"👧🏾":kid.id===1?"👦🏾":"👶🏾",screenX,baseline-7+bob);}
    if(!carried){
      const need=kid.id===careKid&&activeCare?(activeCare==="potty"?"POTTY · 10 SEC":"DIAPER · 10 SEC"):!played[kid.id]?"PLAY WITH ME":"";
      if(need){ctx.fillStyle=need==="PLAY WITH ME"?"#173326e8":"#5a2030ee";ctx.beginPath();ctx.roundRect(screenX-45,baseline-100+bob,90,19,8);ctx.fill();ctx.fillStyle="#fff2d8";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText(need,screenX,baseline-87+bob);}
    }
  };
  const drawStation=(ctx:CanvasRenderingContext2D,cam:number,x:number,floor:number,icon:string,title:string,active=true)=>{
    const sx=x-cam,top=FLOOR_Y[floor]!-51;if(sx<-100||sx>W+100)return;
    ctx.fillStyle=active?"#253d31":"#29312c";ctx.strokeStyle=active?"#e2c17d":"#7a8577";ctx.lineWidth=3;ctx.fillRect(sx-49,top-25,98,47);ctx.strokeRect(sx-49,top-25,98,47);ctx.fillStyle="#fff1d2";ctx.textAlign="center";ctx.font="21px Arial";ctx.fillText(icon,sx,top+1);ctx.font="bold 8px Arial";ctx.fillText(title,sx,top+14);
  };
  const draw=(time:number)=>{
    const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();
    if(!done){
      const choresDone=()=>chores.filter(task=>task.done).length;
      const playsDone=()=>played.filter(Boolean).length;
      if(canFinishInvisibleLoad(choresDone(),playsDone(),!!activeCare,accidentActive)){
        done=true;outcome(host,"The house can wait now. The kids got their Dad, and you made it through the day.",true,onWin);
      }else if(!accidentPopupOpen){
        elapsed+=dt;left-=dt;
        if(!activeCare&&!accidentActive&&careSequence<repeatedCareGoal*2&&elapsed>=nextCareAt){
          const nextKid=careSequence%2===0?1:2;
          const child=kids.find(kid=>kid.id===nextKid);
          if(child&&child.climbTo===undefined){
            activeCare=nextKid===1?"potty":"diaper";careKid=nextKid;careDeadline=elapsed+10;
            msg=activeCare==="potty"?"Matthew needs the potty. Find him within ten seconds.":"Maliyah needs a change. Find her within ten seconds.";
            host.toast(activeCare==="potty"?"Matthew needs the potty · 10 seconds to reach him.":"Maliyah needs a diaper change · 10 seconds to reach her.");
          }
        }
        if(activeCare&&careWindowExpired(elapsed,careDeadline,carryKid!==null))createAccident();
        if(!accidentPopupOpen){
          movePlayer(p,app.keys,dt,1680,acts.jump);if(energy<22)p.vx*=.88;kids.forEach(kid=>moveKid(kid,dt));if(acts.use)interact();
          if(activeCare&&carryKid===null&&careDeadline>0){const remaining=Math.max(0,Math.ceil(careDeadline-elapsed));hud(host.root,"load-urgent",`${activeCare==="potty"?"MATTHEW · POTTY":"MALIYAH · DIAPER"} · ${remaining}s`);}
          else if(activeCare&&carryKid!==null)hud(host.root,"load-urgent",`${activeCare==="potty"?"MATTHEW · BATHROOM":"MALIYAH · CHANGING MAT"}`);
          else if(accidentActive)hud(host.root,"load-urgent","CLEAN UP · PRESS E");
          else hud(host.root,"load-urgent","NO URGENT NEED");
          if(canFinishInvisibleLoad(choresDone(),playsDone(),!!activeCare,accidentActive)){
            done=true;outcome(host,"The house can wait now. The kids got their Dad, and you made it through the day.",true,onWin);
          }
          if(left<=0&&!done){if(!graceUsed){graceUsed=true;left=90;msg="The day ran late. One last 90-second push—keep going.";host.toast("A little overtime grace. Keep going; your progress is safe.");}else{done=true;outcome(host,"The day ran long. Give it another try when you’re ready.",false,undefined,reset);}}
        }
      }
    }
    const cam=clamp(p.x-W*.48,0,720),ctx=app.ctx;drawWorld(ctx,cam,time,"BOSS · THE INVISIBLE LOAD · ONE FULL FAMILY DAY",homeArt,.36);
    chores.forEach(task=>{const x=task.x-cam,y=FLOOR_Y[task.floor]!-47;if(x<-100||x>W+100)return;ctx.fillStyle=task.done?"#2d5841":"#35453c";ctx.strokeStyle=task.done?"#91e0a5":"#e2bd78";ctx.lineWidth=3;ctx.fillRect(x-67,y-24,134,41);ctx.strokeRect(x-67,y-24,134,41);ctx.fillStyle="#fff1d7";ctx.font="bold 8px Arial";ctx.textAlign="center";ctx.fillText(task.done?(task.underWatch?"DONE · KIDS INCOMING":"DONE · SAFE"):task.name,x,y-29);ctx.font="21px Arial";ctx.fillText(task.done?"✓":task.icon,x,y+4);});
    drawStation(ctx,cam,toilet.x,toilet.floor,"🚽","BATHROOM",activeCare==="potty"||carryKid===1);drawStation(ctx,cam,changingMat.x,changingMat.floor,"🧷","CHANGE MAT",activeCare==="diaper"||carryKid===2);
    if(accidentActive)drawStation(ctx,cam,accidentX,accidentFloor,"🧽","CLEAN UP",true);
    coffee.forEach(stop=>drawStation(ctx,cam,stop.x,stop.floor,stop.used?"·":"☕",stop.used?"TAKEN":"COFFEE",!stop.used));
    kids.forEach(kid=>drawKid(ctx,kid,cam,time));drawAaron(ctx,app.hero,p,cam,time);if(carryKid!==null)drawKid(ctx,kids[carryKid]!,cam,time,true);
    const totalDone=chores.filter(task=>task.done).length+played.filter(Boolean).length;
    const atRisk=chores.filter(task=>task.underWatch).length,safe=chores.filter(task=>task.done&&task.undoCount>=3).length;
    hud(host.root,"load-time",`${graceUsed?"LATE · ":""}${gameClock(left)}`);hud(host.root,"load-tasks",`DONE ${totalDone} / ${taskGoal}`);hud(host.root,"load-care",`MATTHEW ${pottyDone} / ${repeatedCareGoal} · MALIYAH ${diaperDone} / ${repeatedCareGoal}`);hud(host.root,"load-play",`PLAY ${played.filter(Boolean).length} / ${playGoal}`);hud(host.root,"load-energy",`ENERGY ${energy}%`);hud(host.root,"load-watch",`CHORES AT RISK ${atRisk} · SAFE ${safe}`);hud(host.root,"load-status",msg);host.root.querySelector<HTMLElement>("#load-time")?.classList.toggle("load-urgent",left<60);host.root.querySelector<HTMLElement>("#load-urgent")?.classList.toggle("load-urgent",!!activeCare||accidentActive);app.next(draw);
  };app.next(draw);
}
