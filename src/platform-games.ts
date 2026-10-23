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
  if(carrying){ctx.globalAlpha=1;ctx.font="28px Arial";ctx.textAlign="center";ctx.fillText(carrying,x+47,yy+21);}ctx.restore();
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
function outcome(host: Host, text: string, win: boolean, onWin?: () => void, retry?: () => void) {
  const box=document.createElement("div");box.className="toybox-outcome";box.innerHTML=`<div class="eyebrow">${win?"ROUND COMPLETE":"ONE MORE TRY"}</div><h2>${text}</h2><p>${win?"You made it through the whole scaffold, one careful step at a time.":"Take a breath, reset the room, and try again."}</p><button class="btn" id="platform-outcome">${win?"Back to the story":"Try again"}</button>`;host.root.querySelector(".platform-game")!.appendChild(box);box.querySelector("button")!.addEventListener("click",()=>{box.remove();if(win){host.close();onWin?.();}else retry?.();});
}
function defeat(host: Host, text: string, retry: () => void) {
  const box=document.createElement("div");box.className="toybox-outcome";box.innerHTML=`<div class="eyebrow">OUT OF HEARTS</div><h2>${text}</h2><p>Your hearts are gone. Choose when you’re ready.</p><div class="outcome-actions"><button class="btn" data-retry>Retry this boss</button><button class="btn secondary" data-quit>Quit to the story</button></div>`;
  host.root.querySelector(".platform-game")!.appendChild(box);
  box.querySelector<HTMLButtonElement>("[data-retry]")!.onclick=()=>{box.remove();retry();};
  box.querySelector<HTMLButtonElement>("[data-quit]")!.onclick=()=>{box.remove();host.close();};
}

export function toyboxPlatformer(host: Host, onWin: () => void) {
  const items=["🧸","🧱","⚽","🚂","📚","🪀","🧩","🦕","🪁","🪇","🚗","🎨","🧸","🚂","⚽","📚","🪁","🧩","🧱","🦕"];
  const toyLanes=[[100,420,740,1080,1430],[110,470,620,1000,1360],[100,500,840,1360,1570],[110,550,700,1050,1480]];
  const toys=items.map((icon,i)=>{const floor=Math.floor(i/5),x=toyLanes[floor]![i%5]!;return{icon,x,floor,done:false,initialX:x};});
  const hazards=[{x:420,floor:1,dir:1,speed:82,label:"PHONE",icon:"▣",cool:0},{x:1080,floor:2,dir:-1,speed:67,label:"TV",icon:"▰",cool:0},{x:1430,floor:3,dir:1,speed:76,label:"PHONE",icon:"▣",cool:0},{x:760,floor:1,dir:-1,speed:55,label:"TV",icon:"▰",cool:0}], hazardStarts=hazards.map(h=>({x:h.x,dir:h.dir}));
  page(host.root,"Operation: floor patrol","Beautiful Chaos · the living room, after bedtime","Twenty toys. Four scaffold levels. Get each toy back to the green chest before the house wakes up.","toy-leave","toy-canvas",`<span>TIME <b id="toy-time">05:00</b></span><span id="toy-count">TOYS 0 / 20</span><span id="toy-carry">HANDS FREE</span><span id="toy-feedback">WATCH THE RED DISTRACTIONS</span>`,`Walk up to a toy and press E. Carry it to the green toy chest on the bottom floor; press E there to drop it off.`);
  const app=begin(host,"toy-leave","toy-canvas"), p:Body={x:110,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};const roomArt=new Image();roomArt.src="/assets/realm-3-toy-room.png";
  let left=300, carry=-1, invul=0, ended=false, message="", msgTime=0; app.last(performance.now());
  const reset=()=>{toys.forEach(t=>{t.done=false;t.x=t.initialX;});hazards.forEach((h,i)=>{h.x=hazardStarts[i]!.x;h.dir=hazardStarts[i]!.dir;h.cool=0;});left=300;carry=-1;invul=0;ended=false;p.x=110;p.y=FLOOR_Y[0]!-57;p.floor=0;p.grounded=true;p.vy=0;hud(host.root,"toy-feedback","WATCH THE RED DISTRACTIONS");app.last(performance.now());};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!ended){left-=dt;movePlayer(p,app.keys,dt,1680,acts.jump);invul=Math.max(0,invul-dt);msgTime=Math.max(0,msgTime-dt);if(msgTime===0)hud(host.root,"toy-feedback","WATCH THE RED DISTRACTIONS");
      if(acts.use){if(carry>=0){const chest=Math.abs(p.x-92)<78&&p.floor===0;if(chest){toys[carry]!.done=true;carry=-1;message="Into the box. One less thing to trip over.";msgTime=2.1;hud(host.root,"toy-feedback",message);}else{message="The green chest is back on the bottom floor.";msgTime=2;hud(host.root,"toy-feedback",message);}}else{const idx=toys.findIndex(t=>!t.done&&t.floor===p.floor&&Math.abs(t.x-p.x)<58);if(idx>=0){carry=idx;message="Got it. Back down to the green chest.";msgTime=2;hud(host.root,"toy-feedback",message);}}}
      for(const h of hazards){h.x+=h.dir*h.speed*dt;if(h.x<80||h.x>1600)h.dir*=-1;h.cool=Math.max(0,h.cool-dt);const same=p.floor===h.floor&&Math.abs(p.x+23-h.x)<43&&Math.abs(p.y-(FLOOR_Y[h.floor]!-75))<35&&!p.duck;if(same&&invul===0&&h.cool===0){left=Math.max(0,left-20);invul=1.15;h.cool=1.4;if(carry>=0){const t=toys[carry]!;t.x=t.initialX;carry=-1;}p.vx=p.x<h.x?-240:240;p.vy=-250;p.grounded=false;hud(host.root,"toy-feedback","HIT! −20 SECONDS · THE TOY DROPPED WHERE IT STARTED");host.toast("Distraction hit: 20 seconds off. Your toy dropped back where you found it.");}}
      const count=toys.filter(t=>t.done).length;hud(host.root,"toy-count",`TOYS ${count} / 20`);hud(host.root,"toy-time",`${Math.floor(left/60).toString().padStart(2,"0")}:${Math.max(0,Math.ceil(left%60)).toString().padStart(2,"0")}`);hud(host.root,"toy-carry",carry>=0?`CARRYING ${toys[carry]!.icon}`:"HANDS FREE");if(count===20){ended=true;outcome(host,"Every toy made it home.",true,onWin);}else if(left<=0){ended=true;outcome(host,"The kids heard something.",false,undefined,reset);}}
    const cam=clamp(p.x-W*.48,0,720);drawWorld(app.ctx,cam,time,"20 TOYS · 4 LEVELS · GREEN CHEST BELOW",roomArt,.22);const ctx=app.ctx;
    const bx=92-cam, by=FLOOR_Y[0]!-50;ctx.save();ctx.shadowColor="#6cff9b";ctx.shadowBlur=25;ctx.strokeStyle="#7af3a4";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(bx,by,57+Math.sin(time/230)*4,42,0,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle="#285943";ctx.fillRect(bx-36,by-25,72,42);ctx.fillStyle="#98ffc0";ctx.font="bold 13px Arial";ctx.textAlign="center";ctx.fillText("TOY CHEST",bx,by-35);
    toys.forEach((t,i)=>{if(t.done||i===carry)return;const x=t.x-cam,y=FLOOR_Y[t.floor]!-28;if(x<-30||x>W+30)return;ctx.fillStyle="#f4e2c2";ctx.beginPath();ctx.ellipse(x,y+10,23,8,0,0,Math.PI*2);ctx.fill();ctx.font="27px Arial";ctx.textAlign="center";ctx.fillText(t.icon,x,y+8);});
    hazards.forEach(h=>{const x=h.x-cam,y=FLOOR_Y[h.floor]!-55;if(x<-60||x>W+60)return;ctx.save();ctx.fillStyle="#4a1528";ctx.strokeStyle="#ff6879";ctx.lineWidth=3;ctx.shadowColor="#ff304e";ctx.shadowBlur=12;ctx.beginPath();ctx.roundRect(x-34,y-26,68,52,10);ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle="#fff3df";ctx.textAlign="center";ctx.font="bold 11px Arial";ctx.fillText(h.label,x,y-6);ctx.font="23px Arial";ctx.fillText(h.icon,x,y+17);});
    drawAaron(ctx,app.hero,p,cam,time,carry>=0?toys[carry]!.icon:"");app.next(draw);
  };app.next(draw);
}

export function midnightPlatformer(host: Host, onWin: () => void) {
  page(host.root,"The Midnight Marathon","Beautiful Chaos · 2:13 a.m.","Move quietly through the scaffolded house. A dropped toy, a bright light, or one buzzing phone can wake a kid.","night-leave","night-canvas",`<span id="night-stage">KEEP THE HOUSE QUIET</span><span id="night-carry">HANDS FREE</span><span id="night-goal">A / D WALK · ↑ / ↓ CLIMB</span>`,`When a big kid wakes, press E close to pick them up, then carry them to their bedroom and press E again. After both are tucked in, answer the baby’s cry.`);
  const app=begin(host,"night-leave","night-canvas"),p:Body={x:820,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};
  const childSprites=["naomi","matthew","maliyah"].map(name=>{const img=new Image();img.src=`/assets/characters/children-${name}-growth.png`;return img;});
  const nightArt=new Image();nightArt.src="/assets/realm-3-home.jpg";
  const drawChild=(ctx:CanvasRenderingContext2D,index:number,x:number,baseline:number,cam:number)=>{const img=childSprites[index]!;const frame=index===2?0:1;const sx=frame*512,screenX=x-cam;if(img.complete&&img.naturalWidth)ctx.drawImage(img,sx,0,512,1024,screenX-26,baseline-94,52,94);else{ctx.font="33px Arial";ctx.textAlign="center";ctx.fillText(index===0?"👧🏾":index===1?"👦🏾":"👶🏾",screenX,baseline-18);}};
  const rooms=[{name:"NAOMI’S ROOM",floor:3,x:110,icon:"N"},{name:"MATTHEW’S ROOM",floor:2,x:1450,icon:"M"},{name:"MALIYAH’S NURSERY",floor:1,x:110,icon:"B"}];
  const noise=[{x:390,floor:1,label:"SQUEAKY TOY",icon:"🧸",dir:1},{x:940,floor:2,label:"LAMP SWITCH",icon:"☼",dir:-1},{x:690,floor:3,label:"BUZZING PHONE",icon:"▣",dir:1}];
  let awake=0,carry=-1,crying=false,finished=false, cooldown=0, kidPos=0, warning="Keep the house quiet.";
  const kidOrder=[0,1];
  const interact=()=>{if(finished)return;if(carry>=0){const r=rooms[carry]!, room=Math.abs(p.x-r.x)<65&&p.floor===r.floor;if(room){carry=-1;awake++;kidPos=0;warning=awake===2?"The baby’s crying now. Back to the nursery!":"Back under the covers. Nice and easy.";host.toast(awake===2?"Both big kids are tucked in. The baby needs you now.":"Tucked back in. The other room is still quiet.");if(awake===2)crying=true;}else warning=`Take them to ${r.name.toLowerCase()}.`;}
      else if(crying&&Math.abs(p.x-rooms[2]!.x)<75&&p.floor===rooms[2]!.floor){crying=false;finished=true;warning="The crying stops. Raiven sits up in bed.";outcome(host,"You settle the baby, then wake Raiven with a whisper.",true,onWin);}
      else if(awake<2&&kidPos>0&&Math.abs(p.x-kidPos)<62&&p.floor===rooms[kidOrder[awake]!]!.floor){carry=kidOrder[awake]!;kidPos=0;warning=`Carry them back to ${rooms[carry]!.name.toLowerCase()}.`;}
      else warning="Stay light on your feet.";
      hud(host.root,"night-goal",warning);};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!finished){movePlayer(p,app.keys,dt,1680,acts.jump);cooldown=Math.max(0,cooldown-dt);if(acts.use)interact();for(const n of noise){n.x+=n.dir*55*dt;if(n.x<250||n.x>1550)n.dir*=-1;const hit=p.floor===n.floor&&Math.abs(p.x+23-n.x)<30&&p.grounded&&cooldown===0;if(hit&&awake<2&&kidPos===0&&carry<0&&!crying){const child=rooms[kidOrder[awake]!]!;kidPos=child.x+(child.x<500?190:-190);warning=`${n.label} — ${awake===0?"Naomi":"Matthew"} is awake!`;cooldown=2;host.toast(`${n.label.toLowerCase()}! ${awake===0?"Naomi":"Matthew"} padded out of their room.`);}}
      if(awake===2&&!crying)crying=true;}
    const cam=clamp(p.x-W*.48,0,720),ctx=app.ctx;drawWorld(ctx,cam,time,"TIPTOE · WAKE A KID · WALK THEM HOME",nightArt,.48);ctx.textAlign="center";
    rooms.forEach((r,i)=>{const x=r.x-cam,y=FLOOR_Y[r.floor]!-52;ctx.fillStyle="#241d27";ctx.fillRect(x-64,y-36,128,43);ctx.strokeStyle="#d9aa79";ctx.lineWidth=2;ctx.strokeRect(x-64,y-36,128,43);ctx.fillStyle="#ffebcd";ctx.font="bold 10px Arial";ctx.fillText(r.name,x,y-19);ctx.font="22px Arial";ctx.fillText(i<2?"🛏️":"🍼",x,y+1);});
    noise.forEach(n=>{const x=n.x-cam;ctx.save();ctx.fillStyle="#55333d";ctx.strokeStyle="#ffcf82";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-34,FLOOR_Y[n.floor]!-60,68,39,7);ctx.fill();ctx.stroke();ctx.restore();ctx.fillStyle="#fff1d5";ctx.font="bold 9px Arial";ctx.fillText(n.label,x,FLOOR_Y[n.floor]!-69);ctx.font="19px Arial";ctx.fillText(n.icon,x,FLOOR_Y[n.floor]!-32);});
    if(kidPos>0&&awake<2&&carry<0){const id=kidOrder[awake]!, floor=FLOOR_Y[rooms[id]!.floor]!;drawChild(ctx,id,kidPos,floor-2,cam);const x=kidPos-cam;ctx.fillStyle="#fff4db";ctx.font="bold 10px Arial";ctx.fillText("E · PICK UP",x,floor-104);}
    if(crying){const x=rooms[2]!.x-cam;drawChild(ctx,2,rooms[2]!.x,FLOOR_Y[1]!-2,cam);ctx.fillStyle="#f5dfa7";ctx.font="bold 12px Arial";ctx.fillText("BABY’S CRYING · NURSERY",x,FLOOR_Y[1]!-112);ctx.fillText("💭",x+38,FLOOR_Y[1]!-92);}
    drawAaron(ctx,app.hero,p,cam,time);if(carry>=0)drawChild(ctx,carry, p.x+48,p.y+39,cam);hud(host.root,"night-stage",awake===0?"NIGHT SHIFT · 0 / 2 KIDS TUCKED IN":`NIGHT SHIFT · ${Math.min(2,awake)} / 2 KIDS TUCKED IN`);hud(host.root,"night-carry",carry>=0?`CARRYING ${rooms[carry]!.name}`:"HANDS FREE");hud(host.root,"night-goal",warning);app.next(draw);
  };app.next(draw);
}

type Foe={x:number;floor:number;name:string;hp:number;dir:number;shot:number;kind:string};
export function breakupBossPlatformer(host: Host, onWin: () => void) {
  page(host.root,"The First Break · climb through the noise","The Beginning · BOSS FIGHT","The breakup is the boss of this chapter. Climb the scaffold, swat away fear and bad timing, and make it to Raiven at the top.","breakup-leave","breakup-canvas",`<span id="breakup-health">♥ ♥ ♥ ♥ ♥</span><span id="breakup-foes">FEARS 0 / 4</span><span id="breakup-status">CLIMB TO THE TOP</span>`,`J swats a nearby fear. Jump or duck under the words they throw. A hit costs one heart; the ladders connect every level.`);
  const app=begin(host,"breakup-leave","breakup-canvas"),p:Body={x:100,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};const breakupArt=new Image();breakupArt.src="/assets/realm-1-park-side.png";const raiven=new Image();raiven.src="/assets/characters/raiven-wedding-dialogue.png";
  const foes:Foe[]=[{x:600,floor:0,name:"BAD TIMING",hp:2,dir:-1,shot:1.2,kind:"clock"},{x:1020,floor:1,name:"WHAT IF?",hp:2,dir:1,shot:1.5,kind:"question"},{x:460,floor:2,name:"UNSAID WORDS",hp:2,dir:-1,shot:1.3,kind:"paper"},{x:1040,floor:3,name:"DOUBT",hp:4,dir:1,shot:1.7,kind:"doubt"}];
  let hp=5, cooldown=0, attackCd=0, swing=0, won=false, defeated=false, message="Move to a ladder and press ↑. Climb back down with ↓."; const projectiles:{x:number;y:number;floor:number;vx:number;glyph:string}[]=[];
  const foeStarts=foes.map(f=>({x:f.x,hp:f.hp,dir:f.dir,shot:f.shot}));
  const retry=()=>{hp=5;cooldown=0;attackCd=0;swing=0;won=false;defeated=false;message="Move to a ladder and press ↑. Climb back down with ↓.";p.x=100;p.y=FLOOR_Y[0]!-57;p.vx=0;p.vy=0;p.floor=0;p.grounded=true;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;p.hurt=0;foes.forEach((f,i)=>{const start=foeStarts[i]!;f.x=start.x;f.hp=start.hp;f.dir=start.dir;f.shot=start.shot;});projectiles.length=0;app.last(performance.now());};
  const takeHit=(fromX:number,label:string)=>{if(cooldown>0||defeated)return;hp=Math.max(0,hp-1);cooldown=1.15;p.hurt=1.15;p.vx=(p.x+29<fromX?-1:1)*220;p.vy=-190;p.grounded=false;p.climbing=false;p.ladderTargetFloor=undefined;p.ladderX=undefined;message=`${label} · ${hp} ${hp===1?"heart":"hearts"} left`;host.toast(message);if(hp===0){defeated=true;p.vx=0;defeat(host,"The climb got away from you.",retry);}};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!won&&!defeated){movePlayer(p,app.keys,dt,1680,acts.jump);cooldown=Math.max(0,cooldown-dt);attackCd=Math.max(0,attackCd-dt);swing=Math.max(0,swing-dt);
      if(acts.attack&&attackCd===0){attackCd=.32;swing=.2;for(const f of foes){if(f.hp>0&&f.floor===p.floor&&Math.abs(f.x-(p.x+23))<105){f.hp--;message=`SWAT! ${f.name} loses ground.`;host.toast(message);break;}}}
      foes.forEach(f=>{if(!f.hp)return;f.x+=f.dir*(34+f.floor*5)*dt;if(f.x<60||f.x>1620)f.dir*=-1;f.shot-=dt;if(f.shot<=0){f.shot=1.65+Math.random()*.6;projectiles.push({x:f.x,y:FLOOR_Y[f.floor]!-64,floor:f.floor,vx:p.x>f.x?115:-115,glyph:f.kind==="paper"?"✉":"!"});}});
      for(let i=projectiles.length-1;i>=0;i--){const q=projectiles[i]!;q.x+=q.vx*dt;const same=q.floor===p.floor&&Math.abs(q.x-(p.x+29))<26&&Math.abs(q.y-(p.y+25))<38&&!p.duck;if(same&&cooldown===0){takeHit(q.x,"A thrown doubt caught you");projectiles.splice(i,1);}else if(q.x<0||q.x>1680)projectiles.splice(i,1);}
      for(const f of foes){const overlapsY=p.y+48>FLOOR_Y[f.floor]!-90&&p.y<FLOOR_Y[f.floor]!-32;if(f.hp&&f.floor===p.floor&&Math.abs(f.x-(p.x+29))<39&&overlapsY&&cooldown===0){takeHit(f.x,f.name);break;}}
      if(!defeated&&foes.every(f=>f.hp===0)&&p.floor===3&&p.x>1540&&!won){won=true;hud(host.root,"breakup-status","SHE’S RIGHT THERE");outcome(host,"You reached Raiven at the top.",true,onWin);}}
    const cam=clamp(p.x-W*.48,0,720),ctx=app.ctx;drawWorld(ctx,cam,time,"BOSS · THE FIRST BREAK · REACH RAIVEN",breakupArt,.52);
    foes.forEach(f=>{if(!f.hp)return;const x=f.x-cam,y=FLOOR_Y[f.floor]!-58;ctx.save();ctx.translate(x,y);ctx.fillStyle=f.name==="DOUBT"?"#4c2545":"#574043";ctx.strokeStyle=f.name==="DOUBT"?"#e29cc1":"#f1ad79";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,20);ctx.lineTo(-20,-14);ctx.lineTo(-10,-34);ctx.lineTo(13,-34);ctx.lineTo(25,-8);ctx.lineTo(22,20);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#fff0d1";ctx.beginPath();ctx.arc(-7,-20,3,0,Math.PI*2);ctx.arc(8,-20,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ffd6ad";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-2);ctx.lineTo(10,-7);ctx.moveTo(-20,4);ctx.lineTo(-35,14);ctx.moveTo(18,3);ctx.lineTo(33,12);ctx.stroke();ctx.restore();ctx.fillStyle="#fff0d7";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(f.name,x,y-46);ctx.fillStyle="#321e27";ctx.fillRect(x-26,y-39,52,5);ctx.fillStyle="#e89783";ctx.fillRect(x-26,y-39,52*(f.hp/(f.name==="DOUBT"?4:2)),5);});
    projectiles.forEach(q=>{ctx.font="bold 24px Arial";ctx.textAlign="center";ctx.fillStyle="#ffe1a5";ctx.shadowColor="#ffbf69";ctx.shadowBlur=10;ctx.fillText(q.glyph,q.x-cam,FLOOR_Y[q.floor]!-57);ctx.shadowBlur=0;});
    const rx=1600-cam,top=FLOOR_Y[3]!-58,cellX=rx-70,cellY=top-88;ctx.fillStyle="#201d22";ctx.fillRect(cellX,cellY,58,106);if(raiven.complete&&raiven.naturalWidth){ctx.drawImage(raiven,cellX+2,cellY+3,54,88);}ctx.strokeStyle="#d7bb8a";ctx.lineWidth=3;ctx.strokeRect(cellX,cellY,58,106);ctx.beginPath();for(let bx=cellX+10;bx<cellX+58;bx+=13){ctx.moveTo(bx,cellY);ctx.lineTo(bx,cellY+106);}ctx.stroke();ctx.fillStyle="#fff0ce";ctx.font="bold 11px Georgia";ctx.textAlign="center";ctx.fillText("RAIVEN",cellX+29,cellY-7);ctx.fillStyle="#f6d487";ctx.font="bold 25px Arial";ctx.shadowColor="#ffd77f";ctx.shadowBlur=15;ctx.fillText("♥",cellX+29,cellY+52);ctx.shadowBlur=0;ctx.fillStyle="#f4d9ae";ctx.font="bold 9px Arial";ctx.fillText("THE HEARTLIGHT",cellX+29,top+30);
    drawAaron(ctx,app.hero,p,cam,time);if(swing>0){const px=p.x-cam+23,py=p.y+27,prog=1-swing/.2;ctx.save();ctx.translate(px,py);ctx.scale(p.face,1);ctx.strokeStyle="#fff2c5";ctx.lineWidth=7;ctx.lineCap="round";ctx.shadowColor="#ffe1a4";ctx.shadowBlur=14;ctx.beginPath();ctx.arc(10,0,39,-1.4+prog*1.45,.6+prog*1.45);ctx.stroke();ctx.strokeStyle="#f2c98a";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(4,4);ctx.lineTo(38,-3+Math.sin(prog*Math.PI)*10);ctx.stroke();ctx.restore();}hud(host.root,"breakup-health",`HEARTS ${"♥ ".repeat(hp).trim()}`);hud(host.root,"breakup-foes",`FEARS ${foes.filter(f=>!f.hp).length} / 4`);hud(host.root,"breakup-status",message);app.next(draw);
  };app.next(draw);
}

export function invisibleLoadPlatformer(host: Host, onWin: () => void) {
  page(host.root,"The Invisible Load","Through Every Season · BOSS FIGHT","Make it through one whole family day. Every task costs energy; two coffee stops can help you finish, but they can’t make the workload fair.","load-leave","load-canvas",`<span>ENERGY <b id="load-energy">100%</b></span><span id="load-tasks">TASKS 0 / 6</span><span id="load-status">START THE MORNING</span>`,`Move between the six chore stations and press E. Coffee restores energy. Finish the day before the meter runs out.`);
  const app=begin(host,"load-leave","load-canvas"),p:Body={x:90,y:FLOOR_Y[0]!-57,vx:0,vy:0,floor:0,grounded:true,climbing:false,face:1,walk:0,hurt:0,duck:false};const homeArt=new Image();homeArt.src="/assets/realm-3-toy-room.png";
  const tasks=[{x:350,floor:0,name:"BREAKFAST + LUNCHES",icon:"🍳",cost:18},{x:900,floor:0,name:"DIAPER BAG + OUTING",icon:"🎒",cost:16},{x:1370,floor:1,name:"DISHES + COUNTER",icon:"🍽️",cost:17},{x:250,floor:2,name:"LAUNDRY + FOLDING",icon:"🧺",cost:18},{x:1050,floor:2,name:"PICKUP + HOMEWORK",icon:"📚",cost:17},{x:820,floor:3,name:"BATH + BEDTIME",icon:"🛁",cost:22}].map(t=>({...t,done:false}));
  const coffee=[{x:630,floor:1,used:false},{x:1450,floor:3,used:false}];let energy=100,failed=false,done=false,msg="A day starts before the house does.";
  const reset=()=>{energy=100;failed=done=false;tasks.forEach(t=>t.done=false);coffee.forEach(c=>c.used=false);p.x=90;p.y=FLOOR_Y[0]!-57;p.floor=0;p.vy=0;app.last(performance.now());};
  const draw=(time:number)=>{const dt=Math.min(.035,(time-app.getLast())/1000||0);app.last(time);const acts=app.take();if(!done&&!failed){movePlayer(p,app.keys,dt,1680,acts.jump);if(acts.use){const task=tasks.find(t=>!t.done&&t.floor===p.floor&&Math.abs(t.x-p.x)<58);const mug=coffee.find(c=>!c.used&&c.floor===p.floor&&Math.abs(c.x-p.x)<65);if(task){task.done=true;energy=Math.max(0,energy-task.cost);msg=`${task.name} done · ${task.cost}% of your energy used.`;host.toast("Another real job, done. The energy meter is lower.");}else if(mug){mug.used=true;energy=Math.min(100,energy+32);msg="A quick coffee. Back to the list.";}else msg="Move close to a station, then press E.";if(energy<=0){failed=true;outcome(host,"The day ran you out of energy.",false,undefined,reset);}if(tasks.every(t=>t.done)){done=true;outcome(host,"You made it to the end of the day.",true,onWin);}}}
    const cam=clamp(p.x-W*.48,0,720);drawWorld(app.ctx,cam,time,"BOSS · THE INVISIBLE LOAD · ONE FULL DAY",homeArt,.34);const ctx=app.ctx;tasks.forEach(t=>{const x=t.x-cam,y=FLOOR_Y[t.floor]!-49;if(x<-90||x>W+90)return;ctx.fillStyle=t.done?"#355c49":"#394b42";ctx.strokeStyle=t.done?"#8fe1a8":"#e6bc7f";ctx.lineWidth=3;ctx.fillRect(x-69,y-27,138,44);ctx.strokeRect(x-69,y-27,138,44);ctx.fillStyle="#fff1d7";ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillText(t.done?"DONE":t.name,x,y-33);ctx.font="23px Arial";ctx.fillText(t.done?"✓":t.icon,x,y+4);});coffee.forEach(c=>{const x=c.x-cam,y=FLOOR_Y[c.floor]!-48;if(x<-50||x>W+50)return;ctx.fillStyle="#8a613d";ctx.strokeStyle="#f4d58d";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-25,y-22,50,38,8);ctx.fill();ctx.stroke();ctx.fillStyle="#fff0d5";ctx.font="22px Arial";ctx.textAlign="center";ctx.fillText(c.used?"·":"☕",x,y+5);if(!c.used){ctx.font="bold 9px Arial";ctx.fillText("COFFEE BREAK",x,y-31);}});drawAaron(ctx,app.hero,p,cam,time);hud(host.root,"load-energy",`${energy}%`);hud(host.root,"load-tasks",`TASKS ${tasks.filter(t=>t.done).length} / 6`);hud(host.root,"load-status",msg);app.next(draw);
  };app.next(draw);
}
