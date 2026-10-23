import Phaser from "phaser";
import { breakupBossPlatformer, invisibleLoadPlatformer, midnightPlatformer, toyboxPlatformer } from "./platform-games";

type StoryData = {
  originalVows: string[];
  ceremonyExcerpts: string[];
  anniversaryLetter: string;
  levelFiveCallback: string;
  optionalMemories: {
    id: string;
    title: string;
    eyebrow: string;
    body: string;
    memory: string;
    achievement: string;
  }[];
  familyMembers: { name: string; born?: string; status?: string; portraitNote?: string }[];
};
type Marker = {
  id: string;
  label: string;
  x: number;
  y: number;
  done?: boolean;
  active?: boolean;
};
const story: StoryData = await fetch("/story-data/story.json").then((r) =>
  r.json(),
);
const root = document.querySelector<HTMLDivElement>("#modal-root")!;
const toastEl = document.querySelector<HTMLDivElement>("#toast")!;
const hud = document.querySelector<HTMLDivElement>("#hud")!;
const interactPrompt =
  document.querySelector<HTMLDivElement>("#interact-prompt")!;
let modalOpen = false;
let activeScene: KingdomScene | null = null;
function setModalOpen(open: boolean) {
  modalOpen = open;
  const scene = activeScene;
  const world = scene?.physics?.world;
  const body = scene?.player?.body as Phaser.Physics.Arcade.Body | undefined;
  if (open) {
    world?.pause();
    if (body) {
      body.setVelocity(0, 0).setAcceleration(0, 0);
      body.enable = false;
    }
  } else {
    if (body) {
      body.enable = true;
      body.setVelocity(0, 0).setAcceleration(0, 0);
    }
    world?.resume();
  }
}
const anniversaryCard = document.querySelector<HTMLElement>("#anniversary-card");
const readyPlayerButton = document.querySelector<HTMLButtonElement>("#ready-player");
const cardLoading = document.querySelector<HTMLElement>("#card-loading");
const fullscreenButtons = [...document.querySelectorAll<HTMLButtonElement>(".fullscreen-toggle")];
const setFullscreenLabels = () => {
  const fullscreen = document.fullscreenElement === document.querySelector("#shell");
  fullscreenButtons.forEach((button) => {
    button.textContent = fullscreen ? "⛶ EXIT FULL SCREEN" : "⛶ FULL SCREEN";
    button.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
  });
};
fullscreenButtons.forEach((button) => button.addEventListener("click", async () => {
  const shell = document.querySelector<HTMLElement>("#shell");
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell?.requestFullscreen();
  } catch {
    toast("Use your browser’s fullscreen button to expand the game.");
  }
}));
document.addEventListener("fullscreenchange", setFullscreenLabels);
readyPlayerButton?.addEventListener("click", () => {
  if (!activeScene) return;
  anniversaryCard?.classList.add("is-dismissing");
  window.setTimeout(() => anniversaryCard?.remove(), 250);
  activeScene.startNew();
});
let toastTimer = 0;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2200);
}
function panel(
  title: string,
  body: string,
  buttons: { label: string; action: () => void; kind?: string }[] = [],
  wide = false,
) {
  setModalOpen(true);
  root.innerHTML = `<article class="panel ${wide ? "wide" : ""}">${body}<div class="actions">${buttons.map((b, i) => `<button class="btn ${b.kind || ""}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div></article>`;
  root.querySelectorAll<HTMLButtonElement>(".actions button[data-i]").forEach(
    (el, i) =>
      (el.onclick = () => {
        const fn = buttons[i]?.action;
        root.innerHTML = "";
        setModalOpen(false);
        fn?.();
      }),
  );
}

function closeMinigame(scene: KingdomScene) {
  root.innerHTML = "";
  setModalOpen(false);
  scene.refreshHud();
}

function familyPackGame(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  const items = [
    { id:"diapers", name:"Diapers", icon:"🧷", need:true },
    { id:"wipes", name:"Wipes", icon:"🧻", need:true },
    { id:"clothes", name:"Spare outfit", icon:"👕", need:true },
    { id:"snacks", name:"Snacks", icon:"🍎", need:true },
    { id:"teddy", name:"Favorite little toy", icon:"🧸", need:false },
    { id:"charger", name:"Backup charger", icon:"🔌", need:false },
    { id:"spreadsheet", name:"A spreadsheet", icon:"📊", need:false },
  ];
  const packed = new Set<string>(); let held = ""; const capacity=5;
  const draw = (note="") => {
    root.innerHTML=`<section class="pack-game"><header class="mini-head"><div><div class="eyebrow">The Beautiful Chaos · family outing prep</div><h1>Everybody ready?</h1><p>Pack the diaper bag. There’s room for five things.</p></div><button class="btn secondary" id="pack-leave">Back to the house</button></header><div class="pack-board"><div class="pack-table"><div class="pack-note">ON THE TABLE</div><div class="pack-items">${items.filter(x=>!packed.has(x.id)).map(x=>`<button class="pack-item ${held===x.id?"selected":""}" data-item="${x.id}"><span>${x.icon}</span>${x.name}</button>`).join("")}</div><p>${note||"Tap an item to pick it up, then tap the open bag."}</p></div><div class="pack-bag" id="pack-bag" role="button" tabindex="0"><span>🎒</span><b>THE DIAPER BAG</b><small>${packed.size} / ${capacity} packed</small><div class="packed-list">${[...packed].map(id=>`<i>${items.find(x=>x.id===id)?.icon}</i>`).join("")||"Drop items here"}</div></div></div><div class="pack-footer"><span>Essentials: diapers · wipes · spare clothes · snacks</span><button class="btn" id="pack-finish">Zip it up</button></div></section>`;
    root.querySelector<HTMLButtonElement>("#pack-leave")!.onclick=()=>closeMinigame(scene);
    root.querySelectorAll<HTMLButtonElement>("[data-item]").forEach(b=>b.onclick=()=>{held=b.dataset.item!;draw();});
    root.querySelector<HTMLElement>("#pack-bag")!.onclick=()=>{if(!held){toast("Pick something up from the table first.");return;}if(packed.size>=capacity){draw("The bag is full. Tap something inside to take it back out.");return;}packed.add(held);held="";draw();};
    root.querySelectorAll<HTMLElement>(".packed-list i").forEach((el,i)=>el.onclick=(e)=>{e.stopPropagation();const id=[...packed][i];packed.delete(id);draw();});
    root.querySelector<HTMLButtonElement>("#pack-finish")!.onclick=()=>{const essentials=items.filter(x=>x.need).every(x=>packed.has(x.id));if(!essentials){toast("One of the kids’ essentials is still on the table.");return;}scene.completeMarker(marker,"The diaper bag is packed with diapers, wipes, a spare outfit, snacks, and one little extra for the kids.");scene.addMemory("Aaron grew from a first-time dad learning diaper changes into a father who can take the kids out, pack supplies, and handle the night shift.");root.innerHTML=`<section class="pack-game"><div class="number-win"><div class="eyebrow">Packed and ready</div><h1>Keys? Wipes? Snacks?</h1><p>You give the bag one last check. The kids are ready for their adventure.</p><button class="btn" id="pack-back">Back to the house</button></div></section>`;root.querySelector<HTMLButtonElement>("#pack-back")!.onclick=()=>closeMinigame(scene);};
  };draw();
}

function seasonPathGame(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  type Season = "spring" | "summer" | "autumn" | "winter";
  const seasons: { id: Season; name: string; icon: string; mark: string }[] = [
    { id: "spring", name: "Spring", icon: "🌱", mark: "SP" },
    { id: "summer", name: "Summer", icon: "☀️", mark: "SU" },
    { id: "autumn", name: "Autumn", icon: "🍂", mark: "AU" },
    { id: "winter", name: "Winter", icon: "❄️", mark: "WI" },
  ];
  const clues: Record<number, Season> = { 0: "spring", 1: "summer", 6: "winter", 8: "autumn", 15: "spring" };
  const blankBoard = () => Array.from({ length: 16 }, (_, i) => clues[i] ?? null) as (Season | null)[];
  let board = blankBoard();
  let selected = -1;
  let pencil = false;
  let feedback = "Each row and column must contain Spring, Summer, Autumn, and Winter once.";
  let hintsUsed = 0;
  const notes = new Map<number, Set<Season>>();
  const clearBoardErrors = () => root.querySelectorAll(".logic-cell.conflict").forEach((cell) => cell.classList.remove("conflict"));
  const isSolved = () => {
    if (board.some((value) => !value)) return false;
    for (let n = 0; n < 4; n++) {
      const row = Array.from({ length: 4 }, (_, c) => board[n * 4 + c]);
      const column = Array.from({ length: 4 }, (_, r) => board[r * 4 + n]);
      if (new Set(row).size !== 4 || new Set(column).size !== 4) return false;
    }
    return true;
  };
  const finish = () => {
    scene.completeMarker(marker, "The four-season mechanism was restored by solving a 4×4 Latin-square puzzle: every row and column holds one Spring, Summer, Autumn, and Winter.");
    scene.unlockAchievement("A PATH THROUGH EVERY SEASON");
    const winter = scene.markers.find((x) => x.id === "winter-memory");
    if (winter) winter.active = true;
    root.innerHTML = `<section class="season-game"><div class="number-win"><div class="eyebrow">The crossing opens</div><h1>One season at a time.</h1><p>The path comes back around. You keep finding your way through it together.</p><button class="btn" id="season-back">Back to the path</button></div></section>`;
    root.querySelector<HTMLButtonElement>("#season-back")!.onclick = () => closeMinigame(scene);
  };
  const draw = () => {
    const filled = board.filter(Boolean).length;
    root.innerHTML = `<section class="season-game"><header class="mini-head"><div><div class="eyebrow">Through Every Season · logic mechanism</div><h1>Restore the Heartlight calendar.</h1><p>Place each season once in every row and every column. Five stones are fixed; solve the rest.</p></div><button class="btn secondary" id="season-leave">Back to the path</button></header><div class="season-board"><div class="logic-intro"><b>THE FOUR-SEASON RULE</b><span>Each row and column gets one of each season. No duplicates.</span><span class="logic-count">${filled} / 16 placed</span></div><div class="logic-wrap"><div class="logic-grid" role="grid" aria-label="Four by four seasonal logic puzzle"><div class="logic-corner">YEAR</div>${seasons.map((season) => `<div class="logic-colhead">${season.icon}<small>${season.mark}</small></div>`).join("")}${Array.from({ length: 4 }, (_, row) => `<div class="logic-rowhead">${String(row + 1).padStart(2, "0")}</div>${Array.from({ length: 4 }, (_, col) => { const i = row * 4 + col; const value = board[i]; const season = seasons.find((s) => s.id === value); const pencilMarks = [...(notes.get(i) || [])].map((id) => seasons.find((s) => s.id === id)!.mark).join(" · "); return `<button class="logic-cell ${clues[i] ? "given" : ""} ${selected === i ? "selected" : ""}" role="gridcell" data-cell="${i}" aria-label="Row ${row + 1}, column ${col + 1}${season ? `, ${season.name}` : ", empty"}" ${clues[i] ? "disabled" : ""}>${season ? `<span class="logic-icon">${season.icon}</span><small>${season.name}</small>` : pencilMarks ? `<span class="logic-notes">${pencilMarks}</span>` : `<span class="logic-empty">${row + 1}.${col + 1}</span>`}${clues[i] ? `<i>CLUE</i>` : ""}</button>`; }).join("")}`).join("")}</div></div><div class="logic-tools"><div class="logic-tray">${seasons.map((season) => `<button class="logic-season" data-season="${season.id}" aria-label="Place ${season.name}"><span>${season.icon}</span>${season.name}</button>`).join("")}</div><div class="season-actions"><button class="btn ${pencil ? "secondary" : "ghost"}" id="season-pencil">${pencil ? "PENCIL ON" : "PENCIL NOTES"}</button><button class="btn secondary" id="season-hint" ${hintsUsed >= 3 ? "disabled" : ""}>Logic hint · ${3 - hintsUsed}</button><button class="btn ghost" id="season-reset">Clear my entries</button></div><p class="logic-feedback" aria-live="polite">${esc(feedback)}</p><p class="small">Select a stone, then a season. When all four rows and columns line up, the crossing opens by itself.</p></div></div></section>`;
    root.querySelector<HTMLButtonElement>("#season-leave")!.onclick = () => closeMinigame(scene);
    root.querySelectorAll<HTMLButtonElement>("[data-cell]").forEach((cell) => cell.onclick = () => { selected = Number(cell.dataset.cell); feedback = clues[selected] ? "That stone is part of the old inscription." : `Row ${Math.floor(selected / 4) + 1}, column ${(selected % 4) + 1} selected.`; draw(); });
    root.querySelectorAll<HTMLButtonElement>("[data-season]").forEach((button) => button.onclick = () => {
      if (selected < 0 || clues[selected]) { feedback = "Choose an empty stone on the calendar first."; draw(); return; }
      const season = button.dataset.season as Season;
      if (pencil) { const set = notes.get(selected) || new Set<Season>(); set.has(season) ? set.delete(season) : set.add(season); notes.set(selected, set); feedback = "Candidate note updated."; }
      else { board[selected] = season; notes.delete(selected); feedback = `Placed ${season[0]!.toUpperCase()}${season.slice(1)}.`; }
      draw();
      if (!pencil && board.every(Boolean)) {
        if (isSolved()) finish();
        else { feedback = "A season repeats in a row or column. Move a stone and the crossing will open when everything fits."; draw(); }
      }
    });
    root.querySelector<HTMLButtonElement>("#season-pencil")!.onclick = () => { pencil = !pencil; feedback = pencil ? "Pencil mode is on. Season buttons now add or remove candidates." : "Pencil mode is off. Season buttons fill the selected stone."; draw(); };
    root.querySelector<HTMLButtonElement>("#season-reset")!.onclick = () => { board = blankBoard(); notes.clear(); selected = -1; feedback = "Entries cleared. The five fixed clues remain."; draw(); };
    root.querySelector<HTMLButtonElement>("#season-hint")!.onclick = () => {
      const tips = [
        "Row 1 already has Spring and Summer. Its two remaining spaces must be Autumn and Winter.",
        "Column 1 already has Spring and Autumn. The two open spaces there must be Summer and Winter.",
        "Row 4 has Spring fixed in column 4. Look at which seasons are already used in columns 1–3 before placing its last three stones.",
      ];
      feedback = tips[hintsUsed++]!; draw();
    };
  };
  draw();
}

function midnightRun(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  midnightPlatformer({ root, toast, close: () => closeMinigame(scene) }, () => {
    coupleScene("Beautiful Chaos · 2:13 a.m. · imagined dialogue", "The whole house is finally quiet", "Raiven", "You got everybody settled? Thank you. I know that took a while.", [
      { label: "We make a pretty good night shift", action: () => { scene.completeMarker(marker, "Aaron quietly gathers Naomi, Matthew, and Maliyah from around the scaffolded house, carries each child to bed, and keeps at it when a noise wakes someone again."); coupleScene("A little before sunrise · imagined dialogue", "Five more minutes", "Aaron", "If we’re both awake, we might as well sit together for a minute.", [{ label: "Stay until morning", action: () => toast("Morning is waiting in the family room.") }], "aaron", "/assets/realm-3-home.jpg"); } },
      { label: "You get some rest. I’ve got the next one", kind: "secondary", action: () => { scene.completeMarker(marker, "Aaron quietly gathers Naomi, Matthew, and Maliyah from around the scaffolded house, carries each child to bed, and keeps at it when a noise wakes someone again."); } },
    ], "raiven", "/assets/realm-3-home.jpg");
  });
}

function toyboxCleanup(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  toyboxPlatformer({ root, toast, close: () => closeMinigame(scene) }, () => {
    scene.completeMarker(marker, "After bedtime Aaron makes a full sweep of the living room, returning fifteen toys to the green chest across four scaffold levels while dodging steady phone and TV distractions. A hit costs thirty seconds and drops the carried toy where it started.");
    toast("Fifteen toys tucked away. The night shift continues.");
  });
}

function weddingSearch(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  const items = [
    { id: "rings", name: "Wedding rings", icon: "💍", x: 76, y: 68 },
    { id: "bouquet", name: "Bridal bouquet", icon: "💐", x: 49, y: 41 },
    { id: "vows", name: "Raiven’s vow pages", icon: "📜", x: 10, y: 24 },
    { id: "boutonniere", name: "Aaron’s boutonniere", icon: "🌼", x: 66, y: 34 },
    { id: "program", name: "Ceremony program", icon: "📖", x: 32, y: 71 },
  ];
  const found = new Set<string>();
  let seconds = 240, mistakes = 0, hints = 3, running = true;
  const clutter = [
    ["🕯️",9,62],["🍂",19,40],["🪑",25,77],["📷",35,50],["🎀",42,22],["🌼",58,54],["🥂",83,34],
    ["🕊️",89,58],["🧣",18,85],["🧥",29,31],["📜",38,75],["🕯️",57,20],["🍁",63,82],["🪞",72,48],
    ["🧺",93,77],["🌹",7,37],["🪑",53,80],["🎗️",45,62],["🕯️",78,19],["🍂",13,51],["👠",33,87],
    ["🌿",68,23],["📷",86,50],["🥂",74,77],["🪻",22,22],["🪻",95,27],["🧥",50,31],["🎀",5,74],
    ["🕊️",59,68],["🍁",97,61],["🪑",39,39],["🕯️",28,59],["📜",80,88],["🌼",14,71],["🧺",67,91],
  ] as const;
  const timerText = () => `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${(seconds % 60).toString().padStart(2,"0")}`;
  const endSearch = (win: boolean) => {
    running = false;
    if (win) {
      scene.completeMarker(marker, "Aaron searched a crowded wedding-day scene under time pressure and recovered the rings, Raiven’s bouquet, the vow pages, Aaron’s boutonniere, and the ceremony program.");
      root.querySelector(".search-art")?.classList.add("search-complete");
      const art = root.querySelector<HTMLElement>(".search-art");
      if (art) art.innerHTML += `<div class="search-finale"><div class="eyebrow">Every last thing is here</div><h2>The vows made it back.</h2><p>The wooden arch is waiting.</p><button class="btn" id="search-return">Return to the ceremony</button></div>`;
      root.querySelector<HTMLButtonElement>("#search-return")!.onclick = leave;
    } else {
      const art = root.querySelector<HTMLElement>(".search-art");
      if (art) art.innerHTML += `<div class="search-finale"><div class="eyebrow">The clock ran out</div><h2>${found.size} keepsakes found.</h2><p>Take another look through the wedding-day clutter.</p><button class="btn" id="search-retry">Search again</button></div>`;
      root.querySelector<HTMLButtonElement>("#search-retry")!.onclick = () => { seconds=240; mistakes=0; hints=3; found.clear(); running=true; draw(); };
    }
  };
  const leave = () => { running = false; window.clearInterval(timer); closeMinigame(scene); };
  const draw = () => {
    const extraClutter = Array.from({length:54},(_,i)=>{
      const icons=["🍂","🕯️","🌼","💍","💐","📜","📖","🎀","🥂","🪑","🧣","📷","🌿","🍁"];
      return [icons[(i*7)%icons.length]!, 5+((i*37+11)%90), 9+((i*53+17)%78)] as const;
    });
    root.innerHTML = `<section class="search-game" aria-label="Wedding hidden object game"><header class="mini-head"><div><div class="eyebrow">Wedding day · before the ceremony</div><h1>Where did those vows go?</h1><p>Search the full scene. The lookalikes are on purpose; the list marks the real items.</p></div><div class="search-tools"><b id="search-time">${timerText()}</b><span id="search-mistakes">MISCLICKS ${mistakes}</span><button class="btn secondary" id="search-hint">HINT · ${hints}</button><button class="btn ghost" id="search-leave">Back to the wedding</button></div></header><div class="search-layout"><div class="search-art" role="group" aria-label="Crowded wedding scene. Find the listed items among the decoys."><div class="search-clutter" aria-hidden="true">${[...clutter,...extraClutter].map(([icon,x,y],i)=>`<span style="--x:${x}%;--y:${y}%;--tilt:${(i%7-3)*9}deg">${icon}</span>`).join("")}</div>${items.map((item) => `<button class="search-object ${found.has(item.id) ? "found" : ""}" style="--x:${item.x}%;--y:${item.y}%" data-item="${item.id}" aria-label="Find ${item.name}" ${found.has(item.id) ? "disabled" : ""}><span>${item.icon}</span></button>`).join("")}<div class="search-note">4:00 · Find the five real items among the ceremony-day lookalikes</div></div><aside class="search-list"><div class="search-count">FOUND <b>${found.size}</b> / 5</div><div class="search-items">${items.map((item) => `<div class="search-row ${found.has(item.id) ? "found" : ""}"><span class="search-icon">${found.has(item.id) ? "✓" : item.icon}</span><span>${esc(item.name)}</span></div>`).join("")}</div><p class="small">Wrong clicks cost four seconds. Three hints are available; each costs 25 seconds.</p></aside></div></section>`;
    root.querySelector<HTMLButtonElement>("#search-leave")!.onclick = leave;
    root.querySelector<HTMLButtonElement>("#search-hint")!.onclick = () => {
      if(!hints){toast("No hints left. Search the scene carefully.");return;}
      const next=items.find(item=>!found.has(item.id)); if(!next)return;
      hints--; seconds=Math.max(0,seconds-25); draw();
      const clue=root.querySelector<HTMLButtonElement>(`[data-item="${next.id}"]`);
      clue?.classList.add("hinting"); window.setTimeout(()=>clue?.classList.remove("hinting"),1600);
      toast(`A brief glint near the ${next.name.toLowerCase()}.`);
    };
    root.querySelector<HTMLElement>(".search-art")!.onclick=(event)=>{
      if((event.target as HTMLElement).closest("[data-item]"))return;
      mistakes++; seconds=Math.max(0,seconds-4);
      const counter=root.querySelector<HTMLElement>("#search-mistakes"); if(counter)counter.textContent=`MISCLICKS ${mistakes}`;
      const clock=root.querySelector<HTMLElement>("#search-time"); if(clock)clock.textContent=timerText();
      toast("That’s a lookalike. The clock keeps moving.");
      if(seconds===0)endSearch(false);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-item]").forEach((button) => button.onclick = () => {
      const id = button.dataset.item!;
      if (found.has(id)) return;
      found.add(id);
      const item = items.find((x) => x.id === id)!;
      toast(`${item.name} — found!`);
      if (found.size === items.length) {
        draw();
        endSearch(true);
        return;
      }
      draw();
    });
  };
  draw();
  const timer = window.setInterval(()=>{
    if(!running)return;
    seconds=Math.max(0,seconds-1);
    const clock=root.querySelector<HTMLElement>("#search-time"); if(clock)clock.textContent=timerText();
    if(seconds===0)endSearch(false);
  },1000);
}

function aisleRun(scene: KingdomScene, marker: Marker) {
  setModalOpen(true);
  const WORLD = 3100, W = 960, H = 540, floor = 426;
  const obstacles = [
    { x: 390, label: "SELF DOUBT", type: "jump", done: false, wind: 0, cooldown: 0, phase: 0 },
    { x: 1040, label: "COLD FEET", type: "fight", done: false, wind: 0, cooldown: 0, phase: 0 },
    { x: 1560, label: "WHAT IF?", type: "jump", done: false, wind: 0, cooldown: 0, phase: 0 },
    { x: 2180, label: "NERVES", type: "fight", done: false, wind: 0, cooldown: 0, phase: 0 },
    { x: 2740, label: "THE BIG MOMENT", type: "fight", done: false, wind: 0, cooldown: 0, phase: 0 },
  ];
  // Keep a generous landing and reaction zone between each gap and jitter.
  const gaps=[{x:660,w:126},{x:1200,w:126},{x:1760,w:126},{x:2330,w:126}];
  root.innerHTML = `<section class="runner-game"><header class="mini-head runner-head"><div><div class="eyebrow">The walk to the wooden arch</div><h1>Okay, deep breath.</h1><p>Jump over any jitter or swat it in range. Watch for the gold flash before it lunges.</p></div><button class="btn secondary" id="runner-leave">Back to the wedding</button></header><div class="runner-hud"><span id="runner-health">♥ ♥ ♥</span><span id="runner-progress">THE ARCH IS AHEAD</span><span>A / D · move &nbsp; SPACE · jump &nbsp; J · swat</span></div><canvas id="runner-canvas" width="960" height="540" aria-label="Side scrolling wedding platform game with attacking jitters"></canvas><div class="runner-touch"><button id="runner-left">◀</button><button id="runner-jump">JUMP</button><button id="runner-attack">SWAT</button><button id="runner-right">▶</button></div></section>`;
  const canvas = root.querySelector<HTMLCanvasElement>("#runner-canvas")!, ctx = canvas.getContext("2d")!;
  const bg = new Image(); bg.src = "/assets/realm-2-wedding-side.png";
  const hero = new Image(); hero.src = "/assets/characters/aaron-walk-sheet.png";
  const keys = new Set<string>();
  const player = { x: 60, y: floor - 74, vx:0, vy: 0, hp: 3, attack: 0, invuln: 0, grounded: true, coyote:.12 };
  let raf = 0, last = 0, complete = false, defeated = false, jumpBuffer = 0, attackRequest = false, walk = 0, facing = 1, lastHitX = -1000, hitFlash = 0, checkpointX=60;
  const onKeyDown = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if ([" ", "arrowleft", "arrowright", "arrowup"].includes(k)) e.preventDefault(); keys.add(k); if ([" ", "arrowup", "w"].includes(k)) jumpBuffer = .18; if (k === "j") attackRequest = true; };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);
  const bind = (id: string, key: string, action?: () => void) => { const b = root.querySelector<HTMLButtonElement>(`#${id}`)!; b.onpointerdown = (e) => { e.preventDefault(); if (action) action(); else keys.add(key); }; b.onpointerup = b.onpointerleave = () => keys.delete(key); };
  bind("runner-left", "arrowleft"); bind("runner-right", "arrowright"); bind("runner-jump", "", () => jumpBuffer = .18); bind("runner-attack", "", () => attackRequest = true);
  const leave = () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); closeMinigame(scene); };
  const retry = () => {
    root.querySelector(".toybox-outcome")?.remove();
    obstacles.forEach((o) => { o.done = false; o.wind = 0; o.cooldown = 0; o.phase = 0; });
    player.x = 60; player.y = floor - 74; player.vx = 0; player.vy = 0; player.hp = 3;
    player.attack = 0; player.invuln = 0; player.grounded = true; player.coyote = .12;
    checkpointX = 60; complete = false; defeated = false; jumpBuffer = 0; last = performance.now();
  };
  const showDefeat = () => {
    const box = document.createElement("div");
    box.className = "toybox-outcome";
    box.innerHTML = `<div class="eyebrow">OUT OF HEARTS</div><h2>Wedding jitters won this round.</h2><p>Take a breath. The arch is still waiting.</p><div class="outcome-actions"><button class="btn" data-retry>Retry the aisle</button><button class="btn secondary" data-quit>Quit to the wedding</button></div>`;
    root.querySelector(".runner-game")!.appendChild(box);
    box.querySelector<HTMLButtonElement>("[data-retry]")!.onclick = retry;
    box.querySelector<HTMLButtonElement>("[data-quit]")!.onclick = leave;
  };
  const loseHeart = (cause: string, enemyX: number) => {
    if (player.invuln > 0 || defeated) return;
    player.hp = Math.max(0, player.hp - 1);
    player.invuln = 1.1;
    player.vx = Math.sign(player.x + 34 - enemyX) * 230;
    player.vy = -190;
    player.grounded = false;
    toast(`${cause} · ${player.hp} hearts left`);
    if (player.hp === 0) { defeated = true; player.vx = 0; showDefeat(); }
  };
  root.querySelector<HTMLButtonElement>("#runner-leave")!.onclick = leave;
  const drawEnemy = (o: typeof obstacles[number], x: number, time: number) => {
    if (o.done) return;
    const bob = Math.sin(time / 115 + o.x) * 4, lunging = o.phase === 2;
    ctx.save(); ctx.translate(x, floor - 4 + bob); if (lunging) ctx.translate(-20, 0);
    ctx.shadowColor = o.wind > 0 ? "#ffbb71" : "#9a81c2"; ctx.shadowBlur = o.wind > 0 ? 24 : 10;
    const body = o.type === "fight" ? "#61516f" : "#49566a", trim = o.type === "fight" ? "#d3a58a" : "#b9c8d8";
    // Storybook jitters have faces, coats, arms and feet rather than abstract blobs.
    ctx.fillStyle = body; ctx.strokeStyle = "#282837"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-22, -64, 44, 48, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(0, -71, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#24212e"; ctx.beginPath(); ctx.ellipse(-6, -72, 2.8, 4, 0, 0, 7); ctx.ellipse(6, -72, 2.8, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#f5d2bc"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -65, 5, .2, Math.PI-.2); ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = 9; ctx.lineCap = "round"; const swing = Math.sin(time / 75 + o.x) * 8;
    ctx.beginPath(); ctx.moveTo(-19,-51); ctx.lineTo(-31,-33+swing); ctx.moveTo(19,-51); ctx.lineTo(31,-33-swing); ctx.stroke();
    ctx.strokeStyle = "#332c3c"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-10,-18); ctx.lineTo(-14+swing/2,0); ctx.moveTo(10,-18); ctx.lineTo(14-swing/2,0); ctx.stroke();
    ctx.restore();
    ctx.textAlign="center"; ctx.font="bold 11px Arial"; ctx.fillStyle="#fff1d9"; ctx.fillText(o.label,x,floor-94);
    if (o.wind > 0) { ctx.fillStyle="#ffcb7b"; ctx.font="bold 10px Arial"; ctx.fillText("LUNGING! JUMP OR SWAT",x,floor-108); }
  };
  const draw = (time: number) => {
    const dt = Math.min(0.034, (time - last) / 1000 || 0); last = time;
    if (!complete && !defeated) {
      const dir = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      if(dir){walk += dt*13;facing=dir;}
      player.vx+=dir*2200*dt;if(!dir)player.vx*=Math.exp(-7*dt);player.vx=Math.max(-325,Math.min(325,player.vx));player.x=Math.max(0,Math.min(WORLD-70,player.x+player.vx*dt));
      player.coyote=player.grounded?.14:Math.max(0,player.coyote-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);
      if(jumpBuffer>0&&(player.grounded||player.coyote>0)){player.vy=-650;player.grounded=false;player.coyote=0;jumpBuffer=0;}
      const gapUnder=gaps.some(g=>player.x+56>g.x&&player.x+12<g.x+g.w);
      const jumpHeld=keys.has(" ")||keys.has("arrowup")||keys.has("w");player.vy+=(jumpHeld&&player.vy<0?1150:1780)*dt;player.y+=player.vy*dt;
      if(!gapUnder&&player.y+74>=floor){player.y=floor-74;player.vy=0;player.grounded=true;player.coyote=.12;}else player.grounded=false;
      if(player.y>H){const sameSpot=player.x;loseHeart("The aisle gap caught you",sameSpot+Math.sign(player.vx||facing)*40);player.x=sameSpot;player.y=floor-74;player.vx=0;player.vy=0;player.grounded=true;}
      const reached=[810,1260,1720,2180,2650].filter(x=>player.x>=x).pop();if(reached&&reached>checkpointX){checkpointX=reached;toast("Aisle checkpoint saved.");}
      player.attack = Math.max(0, player.attack - dt); player.invuln = Math.max(0, player.invuln - dt); hitFlash = Math.max(0, hitFlash - dt);
      if (attackRequest) { player.attack = .36; } attackRequest = false;
      for (const o of obstacles) {
        if (o.done) continue;
        o.cooldown=Math.max(0,o.cooldown-dt); o.wind=Math.max(0,o.wind-dt);
        const dx=o.x-(player.x+34), close=Math.abs(dx)<92;
        // Attacks have a clear wind-up and a visible, forgiving hit window.
        if(close && player.attack>.19){o.done=true;lastHitX=o.x;hitFlash=.2;toast(`${o.label} breaks apart. Nice swat!`);continue;}
        if(close && player.y+68<floor-35){o.done=true;continue;}
        if(close && o.cooldown===0 && !o.wind){o.wind=.5;o.phase=1;}
        if(o.wind>0 && o.wind<.22){o.phase=2;o.x+=Math.sign(player.x-o.x)*150*dt;}
        if(o.wind===0&&o.phase){
          o.phase=0;o.cooldown=.8;
          if(Math.abs(o.x-(player.x+34))<96 && player.invuln===0 && !(player.y+64<floor-30)){loseHeart("A jitter swipe landed",o.x);}
          else if(Math.abs(o.x-(player.x+34))<102){o.done=true;}
        }
      }
      if (player.x >= WORLD - 100) complete = true;
    }
    const cam = Math.max(0, Math.min(WORLD - W, player.x - 230)); ctx.clearRect(0,0,W,H);
    if (bg.complete && bg.naturalWidth) { const scale=H/bg.naturalHeight,bw=bg.naturalWidth*scale,offset=-(cam*.32%Math.max(1,bw-W));ctx.drawImage(bg,offset,0,bw,H);ctx.drawImage(bg,offset+bw,0,bw,H); }
    ctx.fillStyle="#38291e";ctx.fillRect(0,floor,W,H-floor);ctx.fillStyle="#8f633b";ctx.fillRect(0,floor,W,8);
    for(const gap of gaps){const gx=gap.x-cam;if(gx>-150&&gx<W+150){ctx.fillStyle="#131a17";ctx.fillRect(gx,floor-5,gap.w,90);ctx.fillStyle="#b25d58";ctx.fillRect(gx,floor-3,gap.w,6);ctx.fillStyle="#d68b72";for(let sx=gx+7;sx<gx+gap.w;sx+=20){ctx.beginPath();ctx.moveTo(sx,floor+2);ctx.lineTo(sx+7,floor+18);ctx.lineTo(sx+14,floor+2);ctx.fill();}}}
    for(const o of obstacles){const x=o.x-cam;if(x>-80&&x<W+80)drawEnemy(o,x,time);}
    const archX=WORLD-95-cam;ctx.strokeStyle="#6b432c";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(archX-45,floor);ctx.lineTo(archX-45,220);ctx.quadraticCurveTo(archX,160,archX+45,220);ctx.lineTo(archX+45,floor);ctx.stroke();ctx.fillStyle="#f6d28f";ctx.font="bold 17px Georgia";ctx.textAlign="center";ctx.fillText("THE ARCH",archX,floor-205);
    const px=player.x-cam, frame=Math.floor(walk)%8, sw=443, sh=443;
    if(hero.complete&&hero.naturalWidth){ctx.save();if(player.invuln>0&&Math.floor(time/80)%2)ctx.globalAlpha=.45;const crouch=player.grounded&&keys.has("s");const bodyH=crouch?59:82;const bodyY=(player.grounded?floor:player.y+74)-bodyH;if(!player.grounded){ctx.translate(px+35,player.y+38);ctx.rotate(facing*.08);ctx.translate(-(px+35),-(player.y+38));}if(facing<0){ctx.translate(px+70,0);ctx.scale(-1,1);ctx.drawImage(hero,(frame%4)*sw,Math.floor(frame/4)*sh,sw,sh,0,bodyY,70,bodyH);}else ctx.drawImage(hero,(frame%4)*sw,Math.floor(frame/4)*sh,sw,sh,px,bodyY,70,bodyH);ctx.restore();}else{ctx.fillStyle="#233e33";ctx.fillRect(px,player.y+16,44,58);ctx.fillStyle="#d99c79";ctx.beginPath();ctx.arc(px+22,player.y+12,14,0,Math.PI*2);ctx.fill();}
    if(player.attack>0){const progress=1-player.attack/.36, startX=px+(facing>0?49:19), startY=player.y+34;ctx.save();ctx.translate(startX,startY);ctx.scale(facing,1);ctx.strokeStyle="#fff0c8";ctx.lineWidth=7;ctx.lineCap="round";ctx.shadowColor="#ffe4a3";ctx.shadowBlur=18;ctx.beginPath();ctx.arc(7,3,37,-1.45+progress*1.6,.55+progress*1.6);ctx.stroke();ctx.strokeStyle="#f1cf92";ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(32,-7+Math.sin(progress*Math.PI)*10);ctx.stroke();ctx.fillStyle="#fff4dc";ctx.beginPath();ctx.arc(35,-7+Math.sin(progress*Math.PI)*10,7,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(hitFlash>0&&lastHitX>-1000){const hx=lastHitX-cam;ctx.save();ctx.strokeStyle="#fff0c8";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(hx-24,floor-68);ctx.lineTo(hx+24,floor-30);ctx.moveTo(hx+22,floor-70);ctx.lineTo(hx-18,floor-28);ctx.stroke();ctx.restore();}
    if(complete){ctx.fillStyle="#111a16dc";ctx.fillRect(0,0,W,H);ctx.textAlign="center";ctx.fillStyle="#f5deb0";ctx.font="bold 38px Georgia";ctx.fillText("You made it to the arch.",W/2,H/2-28);ctx.fillStyle="#fff4df";ctx.font="20px Arial";ctx.fillText("And she’s right there, smiling at you.",W/2,H/2+12);}
    root.querySelector<HTMLElement>("#runner-health")!.textContent=player.hp?"♥ ".repeat(player.hp).trim():"0 hearts";root.querySelector<HTMLElement>("#runner-progress")!.textContent=complete?"AT THE ARCH":defeated?"RETRY OR QUIT":`${Math.floor(Math.min(100,player.x/WORLD*100))}% TO THE ARCH`;
    if(complete&&!root.querySelector("#runner-return")){const b=document.createElement("button");b.id="runner-return";b.className="btn";b.textContent="Reach the arch";b.onclick=()=>{leave();scene.completeMarker(marker,"Aaron ran the wedding aisle, jumping past or swatting away the jitters before reaching Raiven at the wooden arch.");scene.vowsUnlocked=true;const vowPage=scene.markers.find(x=>x.id==="vows");if(vowPage&&!vowPage.done)scene.completeMarker(vowPage,"The original wedding-vow document is recovered after Aaron reaches the arch.");scene.save();showVows(()=>ceremonySequence(scene),"Continue to the ceremony");};root.querySelector(".runner-game")!.appendChild(b);}
    raf=requestAnimationFrame(draw);
  }; raf=requestAnimationFrame(draw);
}

function memoryScene(
  eyebrow: string,
  heading: string,
  asset: string,
  speaker: string,
  line: string,
  buttons: { label: string; action: () => void; kind?: string }[],
) {
  panel(
    heading,
    `<div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(heading)}</h2><div class="story-scene" style="--scene-art:url('${asset}')"><div class="story-caption"><span>${esc(speaker)}</span><p>${esc(line)}</p></div></div>`,
    buttons,
    true,
  );
}

function coupleScene(
  eyebrow: string,
  heading: string,
  speaker: string,
  line: string,
  buttons: { label: string; action: () => void; kind?: string }[],
  focus: "aaron" | "raiven" = "aaron",
  backdrop = "/assets/realm-1-park-side.png",
  raivenPortrait = "/assets/characters/raiven-dialogue.png",
) {
  panel(
    heading,
    `<div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(heading)}</h2><div class="novel-stage ${focus}" style="background-image:linear-gradient(180deg,#aeb28a22,#0e1713 96%),url('${backdrop}'),url('/assets/realm-1-park-side.png')"><div class="novel-character"><img src="/assets/characters/aaron.png" alt="Aaron"><span>AARON</span></div><div class="novel-character"><img src="${raivenPortrait}" alt="Raiven"><span>RAIVEN</span></div></div><div class="novel-line"><div class="novel-speaker">${esc(speaker)}</div><p>${esc(line)}</p></div>`,
    buttons,
    true,
  );
}

function familyDialogueScene(
  eyebrow: string,
  heading: string,
  speaker: string,
  line: string,
  buttons: { label: string; action: () => void; kind?: string }[],
  photo = "/assets/photos/family/family-with-everyone.jpg",
) {
  const lower = `${eyebrow} ${heading} ${speaker} ${line}`.toLowerCase();
  const childNames = ["Naomi", "Matthew", "Maliyah"] as const;
  const childName = childNames.includes(speaker as (typeof childNames)[number])
    ? (speaker as (typeof childNames)[number])
    : childNames.find((name) => lower.includes(name.toLowerCase()));
  const babyStage = lower.includes("baby") || lower.includes("infant");
  const preschoolStage = lower.includes("preschool");
  const frame = !childName ? 0 : babyStage ? 0 : preschoolStage ? 2 : lower.includes("toddler") ? 1 : 2;
  const spriteAsset = childName
    ? `/assets/characters/children-${childName.toLowerCase()}-growth.png`
    : "";
  panel(
    heading,
    `<div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(heading)}</h2><div class="family-dialogue-stage" style="background-image:linear-gradient(90deg,#10171355,#10171377),url('${photo}')"><div class="family-actors"><img class="family-aaron" src="/assets/characters/aaron.png" alt="Aaron">${childName ? `<div class="family-child-sprite" role="img" aria-label="Illustrated ${esc(childName)} character" style="--child-sheet:url('${spriteAsset}');--child-x:${frame * 50}%"></div>` : ""}</div><div class="family-dialogue-card"><b>${esc(speaker)}</b><p>${esc(line)}</p></div></div>`,
    buttons,
    true,
  );
}

function startCarromGame(scene: KingdomScene, marker: Marker, replay = false) {
  type Side = "raiven" | "aaron";
  type Piece = { x: number; y: number; vx: number; vy: number; side: Side | "queen"; pocketed: boolean };
  setModalOpen(true);
  root.innerHTML = `<article class="panel carrom-panel"><div class="eyebrow">June 2020 · playable first-date memory</div><h2>Carrom · Raiven vs Computer Player</h2><p class="carrom-help">Drag the striker backward and release. Your striker resets to your baseline every turn; the computer uses the far baseline. Pocket your own discs for another shot. The red queen needs a cover: pocket one of your discs on that shot or your next shot. A covered queen earns a bonus point. First to 3 points wins.</p><div class="carrom-score"><span>YOU · <b id="carrom-you">0</b></span><span>COMPUTER · <b id="carrom-cpu">0</b></span><span id="carrom-turn">YOUR TURN</span></div><canvas id="carrom-board" width="640" height="640" aria-label="Playable carrom board"></canvas><div class="actions carrom-actions"><button class="btn secondary" id="carrom-back">${replay ? "Back to the path" : "Leave match"}</button><button class="btn ghost" id="carrom-replay" hidden>Play again</button></div></article>`;
  const canvas = root.querySelector<HTMLCanvasElement>("#carrom-board")!;
  const ctx = canvas.getContext("2d")!;
  const youEl = root.querySelector<HTMLElement>("#carrom-you")!;
  const cpuEl = root.querySelector<HTMLElement>("#carrom-cpu")!;
  const turnEl = root.querySelector<HTMLElement>("#carrom-turn")!;
  const replayBtn = root.querySelector<HTMLButtonElement>("#carrom-replay")!;
  const striker = { x: 320, y: 508, vx: 0, vy: 0, r: 16 };
  const pieces: Piece[] = [];
  const add = (x: number, y: number, side: Piece["side"]) => pieces.push({ x, y, vx: 0, vy: 0, side, pocketed: false });
  const ring = [[0,-34],[24,-24],[34,0],[24,24],[0,34],[-24,24],[-34,0],[-24,-24]];
  ring.forEach(([dx,dy],i)=>add(320+dx!,310+dy!,i%2===0?"raiven":"aaron"));
  const queen = pieces[pieces.length-1]!; queen.side = "queen"; queen.x = 320; queen.y = 310;
  const pockets = [{x:63,y:63},{x:577,y:63},{x:63,y:577},{x:577,y:577}];
  let scores = { raiven: 0, aaron: 0 };
  let turn: Side = "raiven";
  let moving = false;
  let dragging = false;
  let aim = { x: 0, y: 0 };
  let ended = false;
  let raf = 0;
  let closed = false;
  let lastShot = 0;
  let ownPocketedThisShot = false;
  let queenPending: Piece["side"] | null = null;
  let queenCovered = false;
  const close = () => {
    if (closed) return;
    closed = true; cancelAnimationFrame(raf); root.innerHTML = ""; setModalOpen(false);
    if (!replay && ended && !scene.markers.find((x) => x.id === "carrom")?.done) {
      scene.completeMarker(marker, "Playable carrom match inspired by the first-date memory. The historic detail remains: Raiven won both games that day.");
      scene.unlockAchievement("FIRST DATE · CARROM CHALLENGER");
      scene.maybePortal();
      const again = scene.markers.find((x) => x.id === "replay-carrom"); if (again) again.active = true;
      scene.save(); scene.refreshHud();
    }
  };
  const reset = () => {
    pieces.forEach((p,i)=>{ const coords=ring[i] || [0,0]; p.x=320+coords[0]!;p.y=310+coords[1]!;p.vx=0;p.vy=0;p.pocketed=false; });
    queen.x=320; queen.y=310; queenPending=null; queenCovered=false; ownPocketedThisShot=false;
    scores={raiven:0,aaron:0};turn="raiven";moving=false;ended=false;striker.x=320;striker.y=508;striker.vx=0;striker.vy=0;replayBtn.hidden=true; turnEl.textContent="YOUR TURN"; updateScore();
  };
  const updateScore = () => { youEl.textContent=String(scores.raiven);cpuEl.textContent=String(scores.aaron); };
  const colorFor = (side: Piece["side"]) => side === "raiven" ? "#d9a449" : side === "aaron" ? "#58a99a" : "#c54f52";
  const draw = () => {
    ctx.clearRect(0,0,640,640);
    const g=ctx.createLinearGradient(35,35,605,605);g.addColorStop(0,"#b57e4b");g.addColorStop(.5,"#e6c28b");g.addColorStop(1,"#a76e41");
    ctx.fillStyle="#241b15";ctx.fillRect(0,0,640,640);ctx.fillStyle=g;ctx.fillRect(33,33,574,574);
    ctx.strokeStyle="#70452b";ctx.lineWidth=4;ctx.strokeRect(53,53,534,534);ctx.strokeStyle="#bb7c4a";ctx.lineWidth=2;ctx.strokeRect(83,83,474,474);
    ctx.fillStyle="rgba(81,46,28,.15)";for(let i=0;i<640;i+=24){ctx.fillRect(40,i,560,1);}
    ctx.strokeStyle="#8f5635";ctx.lineWidth=3;ctx.beginPath();ctx.arc(320,310,68,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(320,310,10,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#8f5635";ctx.lineWidth=4;for(const y of [112,508]){ctx.beginPath();ctx.moveTo(130,y);ctx.lineTo(510,y);ctx.stroke();}
    pockets.forEach(p=>{ctx.fillStyle="#231813";ctx.beginPath();ctx.arc(p.x,p.y,26,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#edcf9a";ctx.lineWidth=3;ctx.stroke();});
    for(const p of pieces){if(p.pocketed)continue;ctx.shadowColor="#24150d88";ctx.shadowBlur=6;ctx.fillStyle=colorFor(p.side);ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#fff0cc";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#fff8e9";ctx.beginPath();ctx.arc(p.x-3,p.y-3,2,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#f5e8ce";ctx.beginPath();ctx.arc(striker.x,striker.y,striker.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#865e39";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#3d2a1b";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText(turn === "raiven" ? "YOU" : "CPU",striker.x,striker.y+4);
    if(dragging){const dx=striker.x-aim.x,dy=striker.y-aim.y;ctx.strokeStyle="#fff0b2";ctx.lineWidth=4;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(striker.x,striker.y);ctx.lineTo(striker.x+dx*1.6,striker.y+dy*1.6);ctx.stroke();ctx.setLineDash([]);}
    ctx.fillStyle="#f5e7ca";ctx.font="600 13px system-ui";ctx.textAlign="center";ctx.fillText(ended?"MATCH COMPLETE":turn === "raiven" ? "PLACE ON YOUR BASELINE · PULL BACK TO SHOOT" : "COMPUTER BASELINE",320,622);
  };
  const screenPoint = (ev: PointerEvent) => { const r=canvas.getBoundingClientRect();return {x:(ev.clientX-r.left)*640/r.width,y:(ev.clientY-r.top)*640/r.height}; };
  canvas.onpointerdown=(ev)=>{if(ended||turn!=="raiven"||moving)return;const p=screenPoint(ev);if(p.y<478||p.y>538)return;striker.x=Math.max(135,Math.min(505,p.x));striker.y=508;dragging=true;aim=p;canvas.setPointerCapture(ev.pointerId);draw();};
  canvas.onpointermove=(ev)=>{if(dragging){aim=screenPoint(ev);draw();}};
  canvas.onpointerup=(ev)=>{if(!dragging)return;dragging=false;const p=screenPoint(ev);let dx=striker.x-p.x,dy=striker.y-p.y;const mag=Math.hypot(dx,dy);if(mag>7){const pow=Math.min(17,mag*.075);striker.vx=dx/mag*pow;striker.vy=dy/mag*pow;moving=true;ownPocketedThisShot=false;lastShot=Date.now();}draw();};
  const settle = () => {
    const all=[...pieces.filter(p=>!p.pocketed),{x:striker.x,y:striker.y,vx:striker.vx,vy:striker.vy,r:striker.r,pocketed:false,side:"raiven" as const}];
    // Leave the approach lane open to each corner pocket. The old 96..544
    // clamp stopped every disc 33px from a pocket center, outside its radius.
    for(const b of all){b.x+=b.vx;b.y+=b.vy;b.vx*=.985;b.vy*=.985;if(Math.hypot(b.vx,b.vy)<.09){b.vx=0;b.vy=0;}if(b.x<76||b.x>564){b.x=Math.max(76,Math.min(564,b.x));b.vx*=-.86;}if(b.y<76||b.y>564){b.y=Math.max(76,Math.min(564,b.y));b.vy*=-.86;}}
    striker.x=all[all.length-1]!.x;striker.y=all[all.length-1]!.y;striker.vx=all[all.length-1]!.vx;striker.vy=all[all.length-1]!.vy;
    for(let i=0;i<pieces.length;i++){const a=pieces[i]!;if(a.pocketed)continue;for(let j=i+1;j<pieces.length;j++){const b=pieces[j]!;if(b.pocketed)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01;if(d<24){const nx=dx/d,ny=dy/d,over=(24-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(rel>0){a.vx-=rel*nx*.88;a.vy-=rel*ny*.88;b.vx+=rel*nx*.88;b.vy+=rel*ny*.88;}}}
      const dx=a.x-striker.x,dy=a.y-striker.y,d=Math.hypot(dx,dy)||.01;if(d<27){const nx=dx/d,ny=dy/d,rel=(striker.vx-a.vx)*nx+(striker.vy-a.vy)*ny;if(rel>0){striker.vx-=rel*nx*.87;striker.vy-=rel*ny*.87;a.vx+=rel*nx*.87;a.vy+=rel*ny*.87;}}}
    for(const p of pieces){if(p.pocketed)continue;for(const hole of pockets)if(Math.hypot(p.x-hole.x,p.y-hole.y)<24){
      if(p.side === "queen") { p.pocketed = true; queenPending = turn; }
      else if(p.side === turn) { p.pocketed = true; scores[turn]++; ownPocketedThisShot = true; }
      else { p.pocketed=false;p.x=320+(Math.random()-.5)*36;p.y=310+(Math.random()-.5)*36;p.vx=0;p.vy=0; }
      updateScore();
    }}
    const speed=Math.hypot(striker.vx,striker.vy)+pieces.reduce((n,p)=>n+(p.pocketed?0:Math.hypot(p.vx,p.vy)),0);
    if(speed<.13&&Date.now()-lastShot>240){moving=false;striker.vx=0;striker.vy=0;
      if(queenPending === turn && ownPocketedThisShot) { queenCovered=true; queenPending=null; scores[turn]++; toast(turn === "raiven" ? "Queen covered · bonus point!" : "Computer covered the queen · bonus point."); }
      else if(queenPending === turn && !ownPocketedThisShot) { queen.x=320; queen.y=310; queen.pocketed=false; queenPending=null; toast("The queen returns to center without a cover."); }
      if(scores.raiven>=3||scores.aaron>=3){ended=true;turnEl.textContent=scores.raiven>scores.aaron?"YOU WIN":"COMPUTER WINS";replayBtn.hidden=false;root.querySelector("#carrom-back")!.textContent=replay?"Back to the path":"Continue the story";if(scores.raiven>scores.aaron&&!replay)scene.unlockAchievement("CARROM · CLEAN POCKET");}
      else {
        if(!ownPocketedThisShot) turn=turn==="raiven"?"aaron":"raiven";
        striker.x=320; striker.y=turn === "raiven" ? 508 : 112;
        turnEl.textContent=turn==="raiven"?"YOUR TURN":"COMPUTER THINKING…";
        if(turn==="aaron")window.setTimeout(computerShot,650);
      }}
  };
  const computerShot = () => {if(closed||ended||turn!=="aaron")return;striker.x=320;striker.y=112;const target=pieces.filter(p=>!p.pocketed&&p.side==="aaron").sort((a,b)=>Math.hypot(a.x-striker.x,a.y-striker.y)-Math.hypot(b.x-striker.x,b.y-striker.y))[0] || pieces.find(p=>!p.pocketed&&p.side==="queen");if(!target){turn="raiven";striker.y=508;turnEl.textContent="YOUR TURN";return;}const hole=pockets.slice().sort((a,b)=>Math.hypot(target.x-a.x,target.y-a.y)-Math.hypot(target.x-b.x,target.y-b.y))[0]!;let dx=hole.x-target.x,dy=hole.y-target.y,d=Math.hypot(dx,dy)||1;let tx=target.x-dx/d*23-striker.x,ty=target.y-dy/d*23-striker.y,mag=Math.hypot(tx,ty)||1;striker.vx=tx/mag*(8+Math.random()*2);striker.vy=ty/mag*(8+Math.random()*2);moving=true;ownPocketedThisShot=false;lastShot=Date.now();};
  const tick=()=>{if(closed)return;if(moving)settle();draw();raf=requestAnimationFrame(tick);};
  root.querySelector<HTMLButtonElement>("#carrom-back")!.onclick=close;
  replayBtn.onclick=()=>reset();
  tick();
}
function hudUpdate() {
  if (!activeScene) return;
  const s = activeScene;
  const steps = [
    ["sandwich", "conversation", "second-date", "breakup-boss"],
    ["church", "guardian"],
    ["pregnancy", "inventory", "family-timeline", "toybox", "after-bedtime", "midnight", "quiet"],
    ["season", "house", "invisible-load", "clearing"],
    ["callback", "echo", "guard", "choice"],
  ][s.levelIndex] || [];
  const done = steps.filter((id) => s.markers.find((m) => m.id === id)?.done).length;
  const hearts =
    "♥".repeat(Math.max(0, s.hp)) +
    '<span style="color:#56665a">' +
    "♥".repeat(Math.max(0, s.maxHp - s.hp)) +
    "</span>";
  const nextId = steps.find((id) => !s.markers.find((m) => m.id === id)?.done);
  const nextLabel = s.markers.find((m) => m.id === nextId)?.label || s.objectiveText;
  hud.innerHTML = `<span>${esc(s.levelName)}</span><span class="hud-objective">NEXT · ${esc(nextLabel)}</span><span class="quest-progress">STORY ${done}/${steps.length}</span><span class="hearts" aria-label="Health">${hearts}<small>${s.hp}/${s.maxHp}</small></span><span>✦ <b>${s.fragments}/5</b></span><span>Q · ${esc(s.activeAbility || "—")}</span>`;
}
function titleScreen() {
  panel(
    "Our Kingdom",
    `<div class="eyebrow">October 23, 2026 · five years of us</div><h1>Five Years,<br>One Heart</h1><p>From that first date to a house full of little feet—and all the life still ahead.</p><p class="sub">A 25–40 minute adventure through the first hello, the promises, the full house, and every chapter still ahead.</p>`,
    [
      {
        label: "Begin the adventure",
        action: () => {
          activeScene?.startNew();
        },
      },
      {
        label: "Continue saved game",
        kind: "secondary",
        action: () => {
          activeScene?.continueGame();
        },
      },
      {
        label: "Controls & story notes",
        kind: "ghost",
        action: () => controlsScreen(),
      },
    ],
  );
}
function controlsScreen() {
  panel(
    "How to play",
    `<div class="eyebrow">A few useful keys</div><h2>Move, notice, choose.</h2><div class="objective-list"><div class="objective"><span class="mark">A / D · ← / →</span> Walk the side-scrolling path</div><div class="objective"><span class="mark">Space / W / ↑</span> Jump</div><div class="objective"><span class="mark">E</span> Speak, inspect, or use a nearby object</div><div class="objective"><span class="mark">J / left click</span> Attack when a foe is close</div><div class="objective"><span class="mark">Shift</span> Dodge through danger</div><div class="objective"><span class="mark">Q</span> Use your selected ability</div><div class="objective"><span class="mark">1–4</span> Select Memory Echo / Promise Guard / Together / Steadfast</div><div class="objective"><span class="mark">Tab</span> Open Memory Journal · <span class="mark">Esc</span> Pause</div></div><p class="small">Original vows and anniversary words are kept separate from the game dialogue written for these scenes.</p>`,
    [{ label: "Back to title", action: () => titleScreen() }],
  );
}
function openJournal() {
  if (!activeScene) return;
  const s = activeScene;
  const memories = s.memoryLog.length
    ? s.memoryLog
        .map(
          (m, i) =>
            `<div class="objective"><span class="mark">0${i + 1}</span>${esc(m)}</div>`,
        )
        .join("")
    : '<p class="small">Your recovered memories will gather here as you travel.</p>';
  panel(
    "Memory Journal",
    `<div class="eyebrow">The kingdom remembers</div><h2>Collected memories</h2><div class="objective-list">${memories}</div><p><b>Abilities:</b> ${s.abilities.map(esc).join(" · ") || "None yet"}</p><p><b>Achievements:</b> ${s.achievements.map(esc).join(" · ") || "Keep exploring"}</p><p class="small">The complete original vow document is a collectible. It becomes available after it is recovered in The Promise.</p>`,
    [
      { label: "Close journal", action: () => {} },
      {
        label: s.vowsUnlocked
          ? "Read the original vows"
          : "Original vows · locked",
        kind: "secondary",
        action: () =>
          s.vowsUnlocked
            ? showVows()
            : toast("Recover the vow document in The Promise first."),
      },
    ],
    true,
  );
}
function showVows(onClose?: () => void, closeLabel = "Close") {
  const vows = story.originalVows.map((v) => `<p>${esc(v)}</p>`).join("");
  panel(
    "The Words I Almost Forgot",
    `<div class="eyebrow">Original wedding vows · October 23, 2021 · supplied text</div><h2>Raiven’s vows to Aaron</h2><div class="document">${vows}</div><p class="small">Preserved from the supplied original. This scrollable document can be reopened from the Memory Journal.</p>`,
    [
      {
        label: closeLabel,
        action: () => onClose?.() || activeScene?.refreshHud(),
      },
    ],
    true,
  );
}
function pauseScreen() {
  if (!activeScene) return;
  activeScene.pausedByMenu = true;
  activeScene.unlockAchievement("DAD DUTY — GAME PAUSED SUCCESSFULLY");
  const audio = document.getElementById("ambience") as HTMLAudioElement | null;
  panel(
    "Paused",
    `<div class="eyebrow">The adventure can wait</div><h2>${esc(activeScene.levelName)}</h2><p>Take a breath, check your abilities, or return to the journey when you’re ready.</p><p><b>Abilities:</b> ${activeScene.abilities.map(esc).join(" · ") || "None yet"}</p>`,
    [
      {
        label: "Resume",
        action: () => {
          if (activeScene) activeScene.pausedByMenu = false;
        },
      },
      {
        label: "Memory Journal",
        kind: "secondary",
        action: () => openJournal(),
      },
      {
        label: audio?.muted ? "Sound on" : "Sound off",
        kind: "secondary",
        action: () => {
          if (audio) audio.muted = !audio.muted;
          pauseScreen();
        },
      },
      { label: "Return to title", kind: "ghost", action: () => titleScreen() },
    ],
  );
}
function ceremonySequence(scene: KingdomScene) {
  let i = 0;
  const finish = () => scene.completeLevel("Promise Guard", "The Promise");
  const beat = () => {
    const line = story.ceremonyExcerpts[i];
    if (!line) { finish(); return; }
    const closing = i === story.ceremonyExcerpts.length - 1;
    const continueVows = () => { i++; beat(); };
    memoryScene(
      "October 23, 2021 · Raiven’s original vows",
      closing ? "And then you both laughed" : "The Promise",
      "/assets/scenes/wedding-vows.png",
      "Raiven · original vow",
      line,
      closing
        ? [{ label: "Let’s go celebrate", action: () => {
            const music = `<div class="music-credit"><b>Wedding celebration:</b> “Good Thing” · Trip Lee feat. Leah Smith</div><div class="music-frame"><iframe id="good-thing-player" src="https://www.youtube-nocookie.com/embed/CdgihABLoGQ?autoplay=1&mute=0&playsinline=1&controls=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}" title="Trip Lee - Good Thing featuring Leah Smith" allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="music-actions"><button class="btn secondary" id="good-thing-sound">Play Good Thing with sound</button><a class="btn ghost" href="https://www.youtube.com/watch?v=CdgihABLoGQ" target="_blank" rel="noopener">Open in YouTube</a></div><p class="small">The song starts with the scene. If your browser keeps it quiet, tap Play with sound, or open the track in YouTube.</p>`;
            panel("The reception · Good Thing", `<div class="eyebrow">Warm lights, cold air, and finally a dance</div><h2>Okay, this really is pretty sick.</h2>${music}`, [{ label: "See the wedding photos", action: () => weddingSlideshow(finish) }], true);
            wireYouTubeSound("good-thing-sound", "good-thing-player", "CdgihABLoGQ", "Good Thing");
          } }]
        : [{ label: "Stay with her", action: continueVows }],
    );
  };
  coupleScene(
    "October 23, 2021 · under the wooden arch · imagined game dialogue",
    "There you are",
    "Aaron",
    "I made it. The jitters were putting up a fight.",
    [
      { label: "You look beautiful. I’m glad I’m here.", action: () => coupleScene("The Promise · imagined wedding dialogue", "Right where we’re meant to be", "Raiven", "You came all this way to tell me that?", [{ label: "Hold both her hands", action: beat }], "raiven", "/assets/realm-2-wedding-side.png", "/assets/characters/raiven-wedding-dialogue.png") },
      { label: "I may have sprinted past the last one.", kind: "secondary", action: () => coupleScene("The Promise · imagined wedding dialogue", "Right where we’re meant to be", "Raiven", "I saw. At least you’re warmed up now.", [{ label: "Take her hands and smile", action: beat }], "raiven", "/assets/realm-2-wedding-side.png", "/assets/characters/raiven-wedding-dialogue.png") },
    ],
    "aaron",
    "/assets/realm-2-wedding-side.png",
    "/assets/characters/raiven-wedding-dialogue.png",
  );
}

function weddingSlideshow(onDone: () => void) {
  const filenames = Array.from({length:10},(_,i)=>`wedding-${String(i+1).padStart(2,"0")}.jpg`);
  const base = "/assets/photos/wedding/";
  const files=[...filenames.map(name=>({path:base+name,alt:"Wedding day photograph",caption:"A favorite frame from the day we said our vows."})),{path:"/assets/photos/memories/honeymoon.jpg",alt:"Honeymoon photograph",caption:"And then, a little time away together."}];
  void Promise.all(files.map(async file => {
    try { return (await fetch(file.path,{method:"HEAD"})).ok ? file : null; }
    catch { return null; }
  })).then(found => {
    const photos=found.filter((file):file is {path:string;alt:string;caption:string}=>!!file);
    let current=0;
    const render=()=>{
      const shown=photos[current];
      const body=shown
        ? `<div class="eyebrow">${current===photos.length-1&&shown.alt==="Honeymoon photograph"?"A little later · the honeymoon":"October 23, 2021 · ${current+1} of ${photos.length}"}</div><h2>${current===photos.length-1&&shown.alt==="Honeymoon photograph"?"And then, a little time away":"A little more of that day"}</h2><div class="wedding-slide"><img src="${shown.path}" alt="${shown.alt}"></div><p class="small">${shown.caption}</p>`
        : `<div class="eyebrow">October 23, 2021 · the photo album</div><h2>One more look at our day</h2><div class="wedding-slide wedding-slide-empty"><span>♡</span><p>Add photos to <b>public/assets/photos/wedding/</b> as <b>wedding-01.jpg</b> through <b>wedding-10.jpg</b>. Add <b>public/assets/photos/memories/honeymoon.jpg</b> for the closing frame. The slideshow will pick up any files you add.</p></div>`;
      const buttons=photos.length
        ? [
            ...(current>0?[{label:"Previous",kind:"secondary",action:()=>{current--;render();}}]:[]),
            ...(current<photos.length-1?[{label:"Next photo",action:()=>{current++;render();}}]:[{label:"Continue the adventure",action:onDone}]),
            {label:"Skip photos",kind:"ghost",action:onDone},
          ]
        : [{label:"Continue the adventure",action:onDone}];
      panel("Wedding photo slideshow",body,buttons,true);
    };
    render();
  });
}

function wireYouTubeSound(buttonId: string, frameId: string, videoId: string, title: string) {
  const button = root.querySelector<HTMLButtonElement>(`#${buttonId}`);
  const frame = root.querySelector<HTMLIFrameElement>(`#${frameId}`);
  if (!button || !frame) return;
  button.onclick = () => {
    // Reload from this user gesture so the browser can authorize audible playback.
    // The initial autoplay is muted by browser policy; this explicit action asks for sound.
    const origin = encodeURIComponent(window.location.origin);
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&playsinline=1&controls=1&rel=0&enablejsapi=1&origin=${origin}`;
    button.textContent = `Starting “${title}” with sound…`;
    window.setTimeout(() => {
      if (button.isConnected && (button.textContent || "").startsWith("Starting")) {
        button.textContent = "If it’s quiet, press play in the video";
      }
    }, 1800);
  };
}

function epilogue(scene: KingdomScene) {
  const letter = esc(story.anniversaryLetter);
  panel(
    "October 23, 2026",
    `<div class="eyebrow">October 23, 2026 · five years</div><h2>The Promise and the Choice</h2><div class="document">${letter}</div><div class="music-credit"><b>Listen together:</b> “Spend My Life with You” · Eric Benét feat. Tamia</div><div class="music-frame"><iframe id="spend-life-player" src="https://www.youtube-nocookie.com/embed/YS8ba414eOg?autoplay=1&mute=0&playsinline=1&controls=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}" title="Eric Benét featuring Tamia - Spend My Life With You" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="music-actions"><button class="btn secondary" id="spend-life-sound">Play Spend My Life with You with sound</button><a class="btn ghost" href="https://www.youtube.com/watch?v=YS8ba414eOg" target="_blank" rel="noopener">Open in YouTube</a></div><p class="small">The song starts with the scene. If your browser keeps it quiet, tap Play with sound, or open the track in YouTube.</p>`,
    [{ label: "Continue", action: () => finalPhotographs(scene) }],
    true,
  );
  wireYouTubeSound("spend-life-sound", "spend-life-player", "YS8ba414eOg", "Spend My Life with You");
}
async function finalPhotographs(scene: KingdomScene) {
  showVows(() => weddingPhoto(scene));
}
async function weddingPhoto(scene: KingdomScene) {
  const checks = [
    ["Wedding day photograph", "/assets/photos/wedding/wedding-couple.jpg"],
  ];
  let found: string[] = [];
  for (const [label, path] of checks) {
    try {
      const res = await fetch(path, { method: "HEAD" });
      if (res.ok)
        found.push(
          `<div class="epilogue-photo epilogue-photo-wedding"><img src="${path}" alt="${label}"></div>`,
        );
    } catch {}
  }
  const show = found.length
    ? found.join("")
    : `<div class="objective">The wedding photo will appear here when added to <span class="mark">public/assets/photos/wedding/wedding-couple.jpg</span>.</div>`;
  panel(
    "October 23, 2021",
    `<div class="eyebrow">The vows fade into a wedding-day photograph</div><h2>Where the promise began</h2>${show}`,
    [{ label: "Next", action: () => familyPhoto(scene) }],
    true,
  );
}
async function familyPhoto(scene: KingdomScene) {
  let show = "";
  try {
    const path = "/assets/photos/family/family-recent.jpg";
    const res = await fetch(path, { method: "HEAD" });
    show = res.ok
      ? `<img src="${path}" alt="Recent family photo" style="width:100%;max-height:250px;object-fit:cover;border-radius:10px;margin:8px 0">`
      : `<div class="objective">Your recent family photo will appear here after you add <span class="mark">public/assets/photos/family/family-recent.jpg</span>.</div>`;
  } catch {
    show =
      '<div class="objective">Add the recent family photo in <span class="mark">public/assets/photos/family/</span>.</div>';
  }
  panel(
    "October 23, 2026",
    `<div class="eyebrow">The promise continues in family life</div><h2>FIVE YEARS COMPLETED.</h2>${show}<p class="endline">FOREVER UNLOCKED.</p><p>Our greatest adventure is still ahead.</p>`,
    [
      { label: "View our memories", action: () => openJournal() },
      {
        label: "Read my letter again",
        kind: "secondary",
        action: () => epilogue(scene),
      },
      {
        label: "Replay adventure",
        kind: "secondary",
        action: () => scene.startNew(),
      },
      { label: "Return to title", kind: "ghost", action: () => titleScreen() },
    ],
    true,
  );
}

const levels = [
  {
    name: "The Beginning",
    theme: "DISCOVERY",
    colors: ["#29483c", "#53734e", "#dfc079"],
    intro:
      "June 2020. Jersey Mike’s instead of Chipotle, a walk through Heritage Park, and two people trying to act normal on a first date.",
    objective: "Meet Raiven, share a couple of early dates, and find your way through the first hard turn · optional carrom",
    markers: [
      ["sandwich", "Jersey Mike’s · first meeting", 360, 300],
      ["carrom", "Optional · carrom vs computer", 730, 470],
      ["replay-carrom", "Replay carrom vs Computer Player", 730, 570],
      ["conversation", "The quiet clearing", 1120, 310],
      ["second-date", "The second date · frozen yogurt", 1680, 720],
      ["breakup-boss", "A difficult turning point", 2380, 460],
    ],
    ability: "Memory Echo",
  },
  {
    name: "The Promise",
    theme: "COMMITMENT",
    colors: ["#34473d", "#82684a", "#e5bc78"],
    intro:
      "It’s chilly under the wooden arch, and the reception tent is glowing in the distance. Then you realize the vows are still inside the church house.",
    objective: "Find the five missing wedding things, recover the vows, and make it to the arch",
    markers: [
      ["church", "Search the wedding scene", 420, 400],
      ["vows", "The vow document", 1040, 650],
      ["guardian", "Run to the wooden arch", 1560, 730],
      ["side-proposal", "The backyard proposal", 310, 760],
      ["side-colors", "The blue suits", 1390, 230],
    ],
    ability: "Promise Guard",
  },
  {
    name: "The Beautiful Chaos",
    theme: "JOY",
    colors: ["#51433c", "#84715a", "#e7b365"],
    intro:
      "The house is full of tiny shoes, snack crumbs, missing keys, and three kids who all want Dad at once.",
    objective: "Hear the first baby news, get ready for an outing, follow the kids as they grow, and make it through one long night",
    markers: [
      ["pregnancy", "The first little heartbeat", 260, 520],
      ["inventory", "The first family outing", 520, 300],
      ["family-timeline", "Growing up, one day at a time", 1120, 430],
      ["toybox", "Toybox Trouble", 790, 320],
      ["after-bedtime", "A quiet minute together", 1510, 475],
      ["midnight", "The Midnight Marathon", 1840, 580],
      ["quiet", "Morning snuggle", 2150, 230],
      ["side-number-game", "The number game", 560, 690],
      ["side-we-da-boys", "We da boys", 490, 750],
      ["side-crusty-dusty", "Naomi noticed something", 880, 840],
      ["side-horse-express", "Horsey Express", 1450, 390],
      ["side-clarinet", "A clarinet by the fireplace", 1080, 160],
      ["side-lost-item", "The thing Dad misplaced", 520, 180],
      ["side-family-night", "The living-room archive", 1040, 850],
    ],
    ability: "Together",
  },
  {
    name: "Through Every Season",
    theme: "PERSEVERANCE",
    colors: ["#32483d", "#4e6570", "#d7cfb6"],
    intro:
      "One connected landscape moves through spring, summer, autumn, and winter. The path changes, but the Heartlight is still there.",
    objective: "Set the seasonal path, share a home memory, and find a way into the clearing",
    markers: [
      ["season", "Seasonal mechanism", 420, 330],
      ["house", "The changing house", 900, 570],
      ["winter-memory", "A page beneath the snow", 1220, 260],
      ["invisible-load", "One full day at home", 1550, 470],
      ["clearing", "The four-season clearing", 2230, 690],
      ["side-california", "The long way home", 180, 830],
      ["side-invested", "A practical act of care", 940, 160],
    ],
    ability: "Steadfast",
  },
  {
    name: "The Next Adventure",
    theme: "CHOICE",
    colors: ["#2c3b44", "#596e6a", "#edca87"],
    intro:
      "The final realm begins as a shining kingdom and slowly remembers the life that built it.",
    objective:
      "Return to the promise, follow the Heartlight, and choose the next page together",
    markers: [
      ["callback", "A familiar piece of paper", 360, 300],
      ["echo", "Hidden Heartlight traces", 690, 590],
      ["guard", "The open crossing", 930, 320],
      ["choice", "The next page", 1390, 700],
      ["side-road-trip", "The family road map", 220, 790],
      ["side-alternator", "The van’s stubborn alternator", 750, 820],
      ["side-date-night", "The candlelit date-night ticket", 1460, 190],
      ["side-fan", "The bedroom ceiling fan", 210, 180],
      ["side-hands", "A quiet gesture beside the Heartlight", 1040, 860],
    ],
    ability: "Choice",
  },
];
const storageKey = "our-kingdom-save-v3";
const previousStorageKey = "our-kingdom-save-v2";
class KingdomScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  enemies!: Phaser.Physics.Arcade.Group;
  platforms!: Phaser.Physics.Arcade.StaticGroup;
  courseDecor: Phaser.GameObjects.GameObject[] = [];
  courseCheckpoints: number[] = [];
  companion!: Phaser.GameObjects.Container;
  markers: Marker[] = [];
  markerTexts: Phaser.GameObjects.Text[] = [];
  markerObjects: Phaser.GameObjects.GameObject[] = [];
  decor!: Phaser.GameObjects.Graphics;
  levelIndex = 0;
  hp = 5;
  maxHp = 5;
  fragments = 0;
  worldW = 2800;
  worldH = 900;
  memoryLog: string[] = [];
  achievements: string[] = [];
  abilities: string[] = [];
  vowsUnlocked = false;
  pausedByMenu = false;
  started = false;
  levelName = "Title";
  objectiveText = "";
  completed = false;
  portalReady = false;
  hudAt = 0;
  saveAt = 0;
  echoOn = false;
  activeAbility = "";
  guardTimer = 0;
  dashTimer = 0;
  attackCooldown = 0;
  guardianStarted = false;
  toyboxStarted = false;
  runCount = 0;
  gameOverShown = false;
  stepAt = 0;
  checkpointX = 150;
  coyoteTime = 0;
  jumpBuffer = 0;
  swingTimer = 0;
  musicCtx: AudioContext | null = null;
  realmBackground?: Phaser.GameObjects.Image;
  realmSign?: Phaser.GameObjects.Text;
  constructor() {
    super("KingdomScene");
  }
  preload() {
    this.load.image("hero-portrait", "/assets/characters/aaron.png");
    this.load.spritesheet("hero-walk", "/assets/characters/aaron-walk-sheet.png", { frameWidth: 443, frameHeight: 443 });
    this.load.image("raiven-dialogue", "/assets/characters/raiven-dialogue.png");
    this.load.image("realm-0", "/assets/realm-1-park-side.png");
    this.load.image("realm-1", "/assets/realm-2-wedding-side.png");
    this.load.image("realm-2", "/assets/realm-3-family-growth.png");
    this.load.image("realm-3", "/assets/realm-4-seasons.jpg");
    this.load.image("realm-4", "/assets/realm-5-choice.jpg");
  }
  create() {
    this.enemies = this.physics.add.group({
      immovable: false,
      allowGravity: false,
    });
    activeScene = this;
    if (readyPlayerButton) readyPlayerButton.disabled = false;
    if (cardLoading) cardLoading.textContent = "Your quest is ready.";
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.platforms = this.physics.add.staticGroup();
    this.decor = this.add.graphics();
    this.createEnemyTexture();
    this.createCourseTextures();
    this.anims.create({ key: "aaron-walk", frames: this.anims.generateFrameNumbers("hero-walk", { start: 0, end: 7 }), frameRate: 9, repeat: -1 });
    this.player = this.physics.add.sprite(155, 505, "hero-walk", 0);
    this.player.setScale(0.30);
    this.player.setCircle(68, 154, 300);
    this.player.setGravityY(1350);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.platforms);
    const companionGlow = this.add.circle(0, 0, 23, 0xffd58e, 0.18);
    const companionHeart = this.add.star(0, 0, 6, 7, 17, 0xffe4ae, 0.9);
    this.companion = this.add
      .container(112, 480, [companionGlow, companionHeart])
      .setDepth(4)
      .setVisible(false);
    this.tweens.add({
      targets: companionGlow,
      scale: 1.45,
      alpha: 0.04,
      duration: 950,
      yoyo: true,
      repeat: -1,
    });
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = {
      ...this.input.keyboard!.addKeys("W,A,S,D,E,J,Q,SPACE,SHIFT,TAB,ESC,ENTER", true),
      // The ability hotkeys must not call preventDefault: that blocks digits
      // from reaching the number puzzle's HTML input while a modal is open.
      ...this.input.keyboard!.addKeys("ONE,TWO,THREE,FOUR", false),
    } as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on("keydown-TAB", () => {
      if (this.started && !modalOpen) {
        openJournal();
      }
    });
    this.input.keyboard!.on("keydown-ESC", () => {
      if (this.started && !modalOpen) pauseScreen();
    });
    this.input.keyboard!.on("keydown-E", () => {
      if (this.started && !modalOpen) this.interact();
    });
    this.input.keyboard!.on("keydown-J", () => {
      if (this.started && !modalOpen) this.attack();
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.started && !modalOpen) this.attack();
    });
    this.input.keyboard!.on("keydown-Q", () => {
      if (this.started && !modalOpen) this.special();
    });
    this.input.keyboard!.on("keydown-SHIFT", () => {
      if (this.started && !modalOpen) this.dodge();
    });
    this.drawTitleWorld();
    hudUpdate();
    titleScreen();
  }
  createEnemyTexture() {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x171925, 0.62).fillEllipse(32, 84, 42, 10);
    g.fillStyle(0x282936).fillRoundedRect(20, 60, 11, 23, 5).fillRoundedRect(35, 60, 11, 23, 5);
    g.fillStyle(0x171923).fillRoundedRect(15, 78, 18, 7, 3).fillRoundedRect(33, 78, 18, 7, 3);
    g.fillStyle(0x514e67).fillRoundedRect(12, 33, 40, 34, 12);
    g.fillStyle(0x656078).fillTriangle(12, 53, 32, 74, 53, 53);
    g.fillStyle(0x766e83).fillRoundedRect(6, 40, 11, 27, 6).fillRoundedRect(47, 40, 11, 27, 6);
    g.fillStyle(0x373746).fillRoundedRect(5, 62, 12, 8, 4).fillRoundedRect(47, 62, 12, 8, 4);
    g.fillStyle(0x343140).fillEllipse(32, 25, 36, 36);
    g.fillStyle(0x8a8293).fillEllipse(32, 26, 25, 27);
    g.fillStyle(0x302d3c).fillEllipse(32, 28, 19, 18);
    g.fillStyle(0xffd68a, 0.95).fillCircle(27, 27, 2.3).fillCircle(37, 27, 2.3);
    g.lineStyle(3, 0xa7a0b4, 0.9).beginPath().moveTo(18, 41).lineTo(46, 41).strokePath();
    g.fillStyle(0xe2bd84, 0.8).fillRoundedRect(27, 45, 10, 15, 3);
    g.lineStyle(2, 0x282637, 0.9).beginPath().moveTo(19, 51).lineTo(45, 58).strokePath();
    g.fillStyle(0xf3d596, 0.78).fillCircle(32, 8, 4);
    g.generateTexture("enemy", 64, 88);
    g.destroy();
  }
  createCourseTextures() {
    const palettes = [
      [0x5a7350, 0x9ab579],
      [0x66503e, 0xc49c62],
      [0x614a3d, 0xb78d60],
      [0x596970, 0xc6d2d0],
      [0x354852, 0xa6bcb1],
    ];
    palettes.forEach(([side, top], i) => {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x101713, 0.42).fillRoundedRect(2, 10, 316, 50, 8);
      g.fillStyle(side!).fillRoundedRect(0, 7, 316, 48, 8);
      g.fillStyle(top!).fillRoundedRect(0, 0, 316, 17, 7);
      g.fillStyle(0xffffff, 0.16).fillRoundedRect(9, 3, 95, 3, 2);
      g.fillStyle(0x171b18, 0.35);
      [28, 82, 136, 190, 244, 290].forEach((x) => g.fillCircle(x, 42, 3));
      g.generateTexture(`course-${i}`, 320, 64);
      g.destroy();
    });
  }
  buildCourse(level: number) {
    this.platforms.clear(true, true);
    this.courseDecor.forEach((item) => item.destroy());
    this.courseDecor = [];
    this.checkpointX = 150;
    const courses = [
      { floors: [[0,640],[780,600],[1510,530],[2180,620]], ledges: [[690,670,145],[1350,670,155],[1740,645,170],[2420,635,165]] },
      { floors: [[0,640],[800,570],[1510,530],[2170,630]], ledges: [[700,670,145],[1370,645,155],[2070,670,150],[2460,630,155]] },
      { floors: [[0,700],[850,560],[1540,480],[2150,650]], ledges: [[760,680,150],[1370,650,160],[2040,640,175],[2480,655,145]] },
      { floors: [[0,620],[760,630],[1530,470],[2130,670]], ledges: [[690,675,150],[1370,620,180],[2040,660,165],[2480,625,150]] },
      { floors: [[0,700],[860,550],[1520,520],[2180,620]], ledges: [[760,675,150],[1380,640,160],[2050,625,170],[2480,655,150]] },
    ];
    const course = courses[level]!;
    const texture = `course-${level}`;
    const platform = (x: number, top: number, width: number) => {
      const block = this.platforms.create(x, top + 32, texture) as Phaser.Physics.Arcade.Sprite;
      block.setDisplaySize(width, 64).setDepth(-3);
      block.refreshBody();
    };
    // Keep a continuous safe route under the optional ledges, so a missed jump
    // cannot strand Aaron below the playable level.
    platform(this.worldW / 2, 760, this.worldW);
    course.ledges.forEach(([x, top, width]) => platform(x!, top!, width!));
    this.courseCheckpoints = [760, 1450, 2200];
    this.courseCheckpoints.forEach((x) => {
      const post = this.add.rectangle(x, 685, 8, 108, 0xe5c77d, 0.78).setDepth(0);
      const flag = this.add.triangle(x + 21, 648, 0, 0, 36, 12, 0, 24, 0xe6b765, 0.94).setDepth(0);
      this.courseDecor.push(post, flag);
    });
    this.courseDecor.push(this.add.text(150, 610, "JUMP · LAND · KEEP MOVING", {
      fontFamily: "Arial", fontSize: "12px", color: "#fff0ca", backgroundColor: "#17231ddd", padding: { x: 8, y: 5 },
    }).setDepth(2));
  }
  drawTitleWorld() {
    this.decor.clear();
    this.decor.fillGradientStyle(0x1b342c, 0x213d31, 0x1b342c, 0x16271f, 1);
    this.decor.fillRect(0, 0, this.worldW, this.worldH);
    this.drawScenery(0);
    this.player.setPosition(155, 660);
  }
  startNew() {
    this.started = true;
    this.companion.setVisible(true);
    this.playAmbience();
    this.levelIndex = 0;
    this.hp = 5;
    this.fragments = 0;
    this.memoryLog = [];
    this.achievements = [];
    this.abilities = [];
    this.activeAbility = "";
    this.vowsUnlocked = false;
    this.completed = false;
    this.guardianStarted = false;
    this.toyboxStarted = false;
    this.runCount = 0;
    this.pausedByMenu = false;
    this.gameOverShown = false;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(previousStorageKey);
    this.loadLevel(0);
    toast("The Heartlight stirs.");
  }
  continueGame() {
    let save: any;
    try {
      save = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem(previousStorageKey) || "null");
    } catch {}
    if (!save || !save.started) {
      titleScreen();
      toast("No saved journey yet. Begin a new adventure.");
      return;
    }
    this.started = true;
    this.companion.setVisible(true);
    this.playAmbience();
    this.levelIndex = Math.min(4, save.levelIndex || 0);
    this.activeAbility = save.activeAbility || "";
    this.fragments = save.fragments || 0;
    this.hp = save.hp || 5;
    this.memoryLog = (save.memoryLog || []).filter((line: unknown) => !/office of shame|cable management not found/i.test(String(line)));
    this.achievements = (save.achievements || []).filter((achievement: string) => achievement !== "CABLE MANAGEMENT NOT FOUND");
    this.abilities = save.abilities || [];
    this.vowsUnlocked = !!save.vowsUnlocked;
    this.loadLevel(this.levelIndex);
    if (save.completed) {
      this.addMarker(
        this.levelIndex === 4 ? "epilogue-gate" : "exit",
        this.levelIndex === 4 ? "Open the anniversary letter" : "Step through the Heartlight",
        this.worldW - 150,
        840,
      );
    }
    this.markers.forEach((marker, index) => {
      const previous = save.markers?.find((item: any) => item.id === marker.id);
      if (!previous) return;
      marker.done = !!previous.done;
      marker.active = previous.active;
      if (marker.done) {
        (this.markerObjects[index * 3] as any)?.setVisible(false);
        (this.markerObjects[index * 3 + 1] as any)?.setVisible(false);
        this.markerTexts[index]?.setText(`✓ ${marker.label}`).setColor("#c5e1ad");
      }
    });
    const restoreSequence = (ids: string[]) => ids.forEach((id, index) => {
      const marker = this.markers.find((item) => item.id === id);
      if (!marker) return;
      const previous = index === 0 ? true : !!this.markers.find((item) => item.id === ids[index - 1])?.done;
      marker.active = previous && !marker.done;
    });
    if (this.levelIndex === 0) restoreSequence(["sandwich", "conversation", "second-date", "breakup-boss"]);
    if (this.levelIndex === 1) { restoreSequence(["church", "guardian"]); const vows=this.markers.find((item)=>item.id==="vows"); if(vows)vows.active=false; }
    if (this.levelIndex === 2) restoreSequence(["pregnancy", "inventory", "family-timeline", "toybox", "after-bedtime", "midnight", "quiet"]);
    if (this.levelIndex === 3) {
      restoreSequence(["season", "house", "invisible-load", "clearing"]);
      const winter=this.markers.find((item)=>item.id==="winter-memory"); if(winter)winter.active=!!this.markers.find((item)=>item.id==="season")?.done&&!winter.done;
    }
    if (this.levelIndex === 4) restoreSequence(["callback", "echo", "guard", "choice"]);
    this.player.setPosition(Phaser.Math.Clamp(save.playerX ?? 150, 150, this.worldW - 100), 660);
    this.guardianStarted = false;
    this.toyboxStarted = false;
    this.runCount = this.markers.some((m) => m.id === "toybox" && m.done) ? 1 : 0;
    this.completed = !!save.completed;
    this.refreshHud();
    this.save();
    localStorage.removeItem(previousStorageKey);
    toast("Journey restored.");
  }
  playAmbience() {
    const audio = document.getElementById(
      "ambience",
    ) as HTMLAudioElement | null;
    if (audio) {
      audio.volume = 0.18;
      audio.play().catch(() => {});
    }
  }
  save() {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        started: true,
        levelIndex: this.levelIndex,
        fragments: this.fragments,
        hp: this.hp,
        memoryLog: this.memoryLog,
        achievements: this.achievements,
        abilities: this.abilities,
        activeAbility: this.activeAbility,
        vowsUnlocked: this.vowsUnlocked,
        completed: this.completed,
        markers: this.markers.map(({ id, done, active }) => ({ id, done, active })),
        playerX: this.player?.x ?? 150,
        playerY: this.player?.y ?? 500,
        guardianStarted: this.guardianStarted,
        toyboxStarted: this.toyboxStarted,
        runCount: this.runCount,
      }),
    );
  }
  loadLevel(idx: number) {
    this.levelIndex = idx;
    this.levelName = levels[idx].name;
    this.objectiveText = levels[idx].objective;
    this.markers = [];
    this.markerObjects.forEach((o) => o.destroy());
    this.markerObjects = [];
    this.markerTexts = [];
    this.children
      .getAll()
      .filter((o) => o.name === "levelBanner")
      .forEach((o) => o.destroy());
    this.enemies.clear(true, true);
    this.player.setPosition(150, 660);
    this.hp = Math.max(3, this.hp);
    this.portalReady = false;
    this.guardianStarted = false;
    this.toyboxStarted = false;
    this.runCount = 0;
    this.completed = false;
    this.gameOverShown = false;
    this.echoOn = false;
    this.drawScenery(idx);
    this.buildCourse(idx);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    const lev = levels[idx];
    lev.markers.forEach((m) =>
      this.addMarker(
        m[0] as string,
        m[1] as string,
        m[2] as number,
        m[3] as number,
      ),
    );
    const lock = (ids: string[]) =>
      ids.forEach((id) => {
        const marker = this.markers.find((m) => m.id === id);
        if (marker) marker.active = false;
      });
    if (idx === 0) lock(["replay-carrom", "conversation", "second-date", "breakup-boss"]);
    if (idx === 1) lock(["vows", "guardian"]);
    if (idx === 2) lock(["inventory", "family-timeline", "toybox", "after-bedtime", "midnight", "quiet"]);
    if (idx === 3) lock(["house", "winter-memory", "invisible-load", "clearing"]);
    if (idx === 4) lock(["echo", "guard", "choice"]);
    this.refreshHud();
    this.save();
    this.save();
    this.playAmbience();
    panel(
      lev.name,
      `<div class="eyebrow">${lev.theme}</div><h2>${lev.name}</h2><p>${esc(lev.intro)}</p><div class="objective"><span class="mark">OBJECTIVE</span>${esc(lev.objective)}</div><p class="small">Move with <b>A / D</b> or <b>← / →</b>, jump with <b>Space / W / ↑</b>, and press <b>E</b> beside an illustrated keepsake to interact. The <b>NEXT</b> line in the top bar names the next story step; the lantern gate opens when the main objective is complete.</p>`,
      [{ label: "Enter the realm", action: () => {} }],
    );
  }
  drawScenery(idx: number) {
    this.realmBackground?.destroy();
    this.realmBackground = this.add
      .image(0, 0, `realm-${idx}`)
      .setOrigin(0)
      .setDisplaySize(this.worldW, this.worldH)
      .setDepth(-20);
    this.realmSign?.destroy();
    if (idx === 0) {
      this.realmSign = this.add.text(202, 193, "JERSEY MIKE’S", {
        fontFamily: "Arial Black, Arial, sans-serif", fontSize: "21px",
        fontStyle: "bold", color: "#193b67", stroke: "#fff7e7", strokeThickness: 2,
        letterSpacing: 1,
      }).setOrigin(0.5).setDepth(-19);
    }
    this.decor.clear();
    this.decor.setVisible(false);
    this.add
      .text(42, 34, `✦   ${levels[idx]?.name.toUpperCase() || "OUR KINGDOM"}`, {
        fontFamily: "Georgia",
        fontSize: "16px",
        color: "#fff0cf",
        stroke: "#15231d",
        strokeThickness: 4,
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(15)
      .setName("levelBanner");
  }
  addMarker(id: string, label: string, x: number, y: number) {
    // Each realm is now a walkable side-scrolling lane. Former map positions
    // become stage positions along one readable path.
    y = 660;
    this.markers.push({ id, label, x, y });
    const objectGlyphs: Record<string, string> = {
      sandwich: "🥪", carrom: "◉", "replay-carrom": "↻", conversation: "💬", "second-date": "🍦",
      "breakup-boss": "⚔", reunion: "↔", church: "🔎", vows: "📜", guardian: "🌿", "side-proposal": "💍",
      "side-colors": "🌼", pregnancy: "♡", inventory: "🎒",
      toybox: "🧸", "family-timeline": "👣", "after-bedtime": "☕", midnight: "🌙", quiet: "☀️",
      season: "❄", house: "⌂", "winter-memory": "📜", "invisible-load": "⚒", clearing: "✦", callback: "📄", echo: "✧",
      guard: "⬡", choice: "📖", exit: "→", "epilogue-gate": "♡",
    };
    const glyph = objectGlyphs[id] || (id.startsWith("side-") ? "✦" : "•");
    const glow = this.add.circle(x, y, 34, 0xf2c574, 0.14).setDepth(2);
    this.markerObjects.push(glow);
    this.tweens.add({
      targets: glow,
      scale: 1.42,
      alpha: 0.035,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
    const badge = this.add.container(x, y, [
      this.add.ellipse(0, 42, 44, 12, 0x101713, 0.46),
      this.add.circle(0, 0, 25, 0x17231d, 0.96).setStrokeStyle(2, 0xf1d39a, 0.95),
      this.add.circle(0, 0, 20, 0x596348, 0.98).setStrokeStyle(1, 0xfff0cf, 0.58),
      this.add.text(0, 0, glyph, { fontFamily: "Arial, sans-serif", fontSize: glyph.length > 1 ? "24px" : "27px", color: "#fff1d0" }).setOrigin(0.5),
    ]).setDepth(3);
    this.markerObjects.push(badge);
    const t = this.add
      .text(x, y - 45, label, {
        fontSize: "13px",
        fontFamily: "Arial",
        color: "#fff3d8",
        backgroundColor: "#17231dcc",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.markerTexts.push(t);
    this.markerObjects.push(t);
  }
  addMemory(text: string) {
    if (!this.memoryLog.includes(text)) this.memoryLog.push(text);
    this.refreshHud();
    this.save();
  }
  unlockAchievement(name: string) {
    if (this.achievements.includes(name)) return;
    this.achievements.push(name);
    this.save();
    toast(`Achievement unlocked · ${name}`);
  }
  get completedObjectiveCount() {
    return this.markers.filter(
      (m) => m.done && ["sandwich", "carrom", "conversation"].includes(m.id),
    ).length;
  }
  refreshHud() {
    hudUpdate();
    this.markers.forEach((marker, index) => {
      const visible = marker.active !== false && !marker.done;
      (this.markerObjects[index * 3] as any)?.setVisible(visible);
      (this.markerObjects[index * 3 + 1] as any)?.setVisible(visible);
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
      const labelVisible = marker.active !== false && distance < 285 && (!marker.done || distance < 190);
      this.markerTexts[index]?.setVisible(labelVisible);
      if (marker.done) this.markerTexts[index]?.setText(`✓ ${marker.label}`).setColor("#c5e1ad");
    });
    const nearest = this.nearestMarker();
    if (nearest && this.started && !modalOpen) {
      interactPrompt.textContent = `E  ·  ${nearest.label}`;
      interactPrompt.classList.add("show");
    } else interactPrompt.classList.remove("show");
  }
  nearestMarker() {
    return this.markers
      .filter((m) => !m.done && m.active !== false)
      .map((m) => ({
        m,
        d: Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y),
      }))
      .filter((x) => x.d < 75)
      .sort((a, b) => a.d - b.d)[0]?.m;
  }
  interact() {
    const m = this.nearestMarker();
    if (!m) {
      toast("Follow the NEXT story step in the top bar. Press E when Aaron is beside its keepsake.");
      return;
    }
    if (m.id.startsWith("side-")) {
      this.sideMemory(m);
      return;
    }
    if (m.id === "exit") {
      this.loadLevel(this.levelIndex + 1);
      return;
    }
    if (m.id === "epilogue-gate") {
      epilogue(this);
      return;
    }
    if (m.id === "carrom" || m.id === "replay-carrom") {
      startCarromGame(this, m, m.id === "replay-carrom");
      return;
    }
    if (this.levelIndex === 0) this.levelOne(m);
    else if (this.levelIndex === 1) this.levelTwo(m);
    else if (this.levelIndex === 2) this.levelThree(m);
    else if (this.levelIndex === 3) this.levelFour(m);
    else this.levelFive(m);
  }
  sideMemory(m: Marker) {
    const entry=story.optionalMemories.find(item=>item.id===m.id.slice("side-".length));
    if(!entry){toast("This little memory is still being written.");return;}
    if(entry.id==="number-game"){this.numberGame(m,entry);return;}
    if(entry.id==="colors"){this.colorPuzzle(m,entry);return;}
    const keep=()=>{this.completeMarker(m,entry.memory);this.unlockAchievement(entry.achievement);};
    const kidMemories:Record<string,{child:string;label:string;line:string;answers:[string,string];reply:string;photo?:string}>={
      "we-da-boys":{child:"Matthew",label:"We da boys",line:"Matthew runs over with a grin: ‘We da boys!’",answers:["We da boys—and Maliyah’s captain.","That’s right, buddy. I’m right here."],reply:"He leans against you. The big feeling passes, then he’s ready for the next thing.",photo:"/assets/photos/family/family-with-everyone.jpg"},
      "crusty-dusty":{child:"Naomi",label:"The official report",line:"Naomi looks you over: ‘Dada, you’re crusty dusty.’",answers:["I’ll take that under advisement.","Okay, I need the whole report."],reply:"She gives you a serious little nod. You are, apparently, still crusty dusty.",photo:"/assets/photos/family/family-with-mom.jpg"},
      "horse-express":{child:"Maliyah",label:"Horsey Express",line:"The kids climb aboard your back. Someone calls, ‘Again, Dad!’",answers:["Tickets, please. Where are we headed?","All aboard. One more ride."],reply:"Three little passengers vote for one more lap around the living room.",photo:"/assets/photos/family/family-with-everyone.jpg"},
      "lost-item":{child:"Naomi",label:"A reliable lost-and-found",line:"Naomi spots your keys before you do. ‘Mama should keep these. Dada loses stuff.’",answers:["I appreciate this very organized system.","I knew you’d find them, detective."],reply:"She gives the keys to Mama. Problem solved.",photo:"/assets/photos/family/family-with-mom.jpg"},
      "family-night":{child:"Matthew",label:"The family room vote",line:"The kids have picked a movie, three snacks, and the exact spot where Dad has to sit.",answers:["I accept my assigned seat.","Can I at least pick the song first?"],reply:"Queen or the Beatles? The kids start singing before the vote is finished.",photo:"/assets/photos/family/family-with-everyone.jpg"},
    };
    const kid=kidMemories[entry.id];
    if(kid){familyDialogueScene(`A little scene from home · ${kid.child} · imagined dialogue`,kid.label,kid.child,kid.line,kid.answers.map(answer=>({label:answer,action:()=>familyDialogueScene(`A little scene from home · ${kid.child}`,kid.label,"Aaron",answer,[{label:"Keep this one",action:()=>familyDialogueScene(`A little scene from home · ${kid.child}`,"That’s us",kid.child,kid.reply,[{label:"Save the memory",action:keep}],kid.photo)}],kid.photo)})),kid.photo);return;}
    const scripts:Record<string,{start:string;answers:[string,string];reply:[string,string];place?:string}>={
      preunion:{start:"It’s funny that we found each other again on Upward after deciding we should just be friends for a while.",answers:["I’m glad we gave it another chance.","Turns out the friendship plan didn’t last long."],reply:["Me too. The easy part was always talking to you.","We were not especially convincing at being just friends."],place:"/assets/realm-1-park-side.png"},
      proposal:{start:"I still don’t remember you actually asking the question.",answers:["I’m pretty sure I asked.","You asked what you were doing with the ring."],reply:["I remember saying, ‘What are you doing?’", "And then we both figured it out anyway."],place:"/assets/photos/memories/proposal.jpg"},
      clarinet:{start:"Your clarinet is still there by the fireplace. I know you miss playing.",answers:["One day I’d still love to play with a symphony.","Maybe we can find a little time for it again."],reply:["I hope you do. I love hearing you play.","The dream can wait until the house is a little quieter."],place:"/assets/realm-3-home.jpg"},
      california:{start:"You drove all the way from Altadena to Lancaster and back again so I could stay with Jamie.",answers:["I wanted you to have time with everybody.","Those drives gave us plenty of time to talk."],reply:["You made a long visit feel a lot less lonely.","You did rack up some miles that week."],place:"/assets/realm-1-park-side.png"},
      invested:{start:"You paid off my student loans and car loan not long after the wedding.",answers:["I wanted to make the road a little lighter for us.","It felt good to take something heavy off the list."],reply:["It meant more than I knew how to say then.","That was one very practical love note."],place:"/assets/realm-4-seasons.jpg"},
      "road-trip":{start:"Remember the drive from Michigan to Texas? Ohio, Nashville, Memphis, Arkansas… and all those stops.",answers:["The kids did great. Better than the van.","I’d do that long road with you again."],reply:["We collected a lot of little stories on that trip.","Let’s maybe check the alternator first next time."],place:"/assets/realm-3-home.jpg"},
      alternator:{start:"Cincinnati wasn’t exactly the stop we planned when the alternator gave out.",answers:["I was disappointed to miss the museum, but we made it home.","At least the zoo was still open."],reply:["You handled the van while we kept the day moving.","The kids still talk about the animals."],place:"/assets/realm-3-home.jpg"},
      "date-night":{start:"That candlelight R&B show and the Detroit Princess cruise had a very early-bird crowd.",answers:["The music was good. The bedtime was even better.","We were clearly the youngest people there."],reply:["We still had a good time together.","And we got home before it got too late."],place:"/assets/realm-1-park-side.png"},
      fan:{start:"You still blame the bedroom fan for dry skin and lips.",answers:["I’m standing by my theory.","Maybe the lotion and chapstick deserve a trial."],reply:["The fan is staying on. We can investigate the chapstick.","I knew you’d come around to the evidence."],place:"/assets/realm-3-home.jpg"},
      hands:{start:"You always reach for my hand when we’re walking.",answers:["I like being close to you.","I’ll keep asking with my hand and let you decide."],reply:["I know. I notice the little reaches.","That works for me. I like choosing it, too."],place:"/assets/realm-5-choice.jpg"},
    };
    const script=scripts[entry.id]||{start:entry.body,answers:["I’m glad this is part of our story.","I want to remember this one."],reply:["Me too. That was a very us kind of day.","I’m glad we kept that little detail."],place:"/assets/realm-1-park-side.png"};
    const wedding=this.levelIndex===1?"/assets/characters/raiven-wedding-dialogue.png":"/assets/characters/raiven-dialogue.png";
    const finish=(chosen:number)=>coupleScene(`${entry.eyebrow} · imagined game dialogue`,entry.title,"Raiven",script.reply[chosen],[{label:"Keep this memory",action:keep}],"raiven",script.place||"/assets/realm-1-park-side.png",wedding);
    coupleScene(`${entry.eyebrow} · imagined game dialogue`,entry.title,"Raiven",script.start,script.answers.map((answer,index)=>({label:answer,kind:index?"secondary":undefined,action:()=>coupleScene(`${entry.eyebrow} · imagined game dialogue`,entry.title,"Aaron",answer,[{label:"Hear her answer",action:()=>finish(index)}],"aaron",script.place||"/assets/realm-1-park-side.png",wedding)})),"raiven",script.place||"/assets/realm-1-park-side.png",wedding);
  }
  numberGame(m: Marker, entry: StoryData["optionalMemories"][number]) {
    setModalOpen(true);
    const target = 1 + Math.floor(Math.random() * 100);
    let tries = 0;
    let hints = 4;
    let guessText = "50";
    const usedHints = new Set<string>();
    const render = (message = "") => {
      root.innerHTML = `<section class="number-game"><header class="mini-head"><div><div class="eyebrow">Family game night · a faithful memory</div><h1>Pick a number, any number.</h1><p>Type any number from 1 to 100. You get seven guesses and four logic questions.</p></div><button class="btn secondary" id="number-leave">Back to the family room</button></header><div class="number-board"><div class="number-scene"><div class="number-glow">?</div><div class="number-card">${message || "Raiven has picked a number. What’s your first guess?"}</div><div class="number-guess"><input id="number-input" type="number" inputmode="numeric" min="1" max="100" step="1" placeholder="Type 1–100" value="${esc(guessText)}" autocomplete="off" aria-label="Type a number from 1 to 100"><button class="btn" id="number-submit">Guess</button></div><div class="number-hints"><div class="hint-head">ASK A QUESTION · ${hints} LEFT</div>${[{id:"parity",label:"Is the whole number even?"},{id:"half",label:"Is it above or below 50?"},{id:"digits",label:"How many digits?"},{id:"first",label:"Is the first digit even?"},{id:"sum",label:"Is the digit sum even?"},{id:"ends",label:"Is the last digit bigger than the first?"},{id:"five",label:"Is it a multiple of five?"}].map(h=>`<button class="hint-btn" data-hint="${h.id}" ${usedHints.has(h.id)||!hints?"disabled":""}>${h.label}</button>`).join("")}</div><div class="guess-history" id="guess-history">Guesses: ${tries} / 7</div></div></div><p class="small number-footnote">This round’s number is made up for the game. The real memory is how you both approached the puzzle: Raiven looked for a life milestone; Aaron started narrowing the math.</p></section>`;
      root.querySelector<HTMLButtonElement>("#number-leave")!.onclick=()=>closeMinigame(this);
      const input=root.querySelector<HTMLInputElement>("#number-input")!;
      const submit=()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>100){toast("Pick a whole number from 1 to 100.");return;}tries++;const history=root.querySelector<HTMLElement>("#guess-history")!;history.textContent=`Guesses: ${tries} / 7`;if(n===target){sceneWin();return;}const result=n<target?"Higher!":"Lower!";root.querySelector<HTMLElement>(".number-card")!.textContent=result; if(tries>=7){root.querySelector<HTMLElement>(".number-card")!.textContent=`The number was ${target}. Want another round?`;root.querySelector<HTMLButtonElement>("#number-submit")!.textContent="Try again";root.querySelector<HTMLButtonElement>("#number-submit")!.onclick=()=>{tries=0;render();};}};
      root.querySelector<HTMLButtonElement>("#number-submit")!.onclick=submit;
      input.oninput=()=>guessText=input.value;input.onkeydown=(e)=>{if(e.key==="Enter")submit();};input.focus();input.select();
      root.querySelectorAll<HTMLButtonElement>("[data-hint]").forEach(btn=>btn.onclick=()=>{const id=btn.dataset.hint!;if(usedHints.has(id)||hints<=0)return;usedHints.add(id);hints--;let answer="";if(id==="parity")answer=target%2===0?"It’s even.":"It’s odd.";if(id==="half")answer=target>50?"It’s above 50.":target<50?"It’s below 50.":"It’s exactly 50.";if(id==="digits"){const count=String(target).length;answer=`It has ${count} ${count===1?"digit":"digits"}.`;}if(id==="first")answer=Number(String(target)[0])%2===0?"Yes, its first digit is even.":"No, its first digit is odd.";if(id==="sum")answer=String(target).split("").reduce((total,digit)=>total+Number(digit),0)%2===0?"Yes, its digits add up to an even number.":"No, its digits add up to an odd number.";if(id==="ends")answer=Number(String(target).slice(-1))>Number(String(target)[0])?"Yes, the last digit is bigger.":"No, the last digit is not bigger.";if(id==="five")answer=target%5===0?"Yes, it is a multiple of five.":"No, it is not a multiple of five.";render(answer);});
    };
    const sceneWin=()=>{this.completeMarker(m,entry.memory);this.unlockAchievement(entry.achievement);root.innerHTML=`<section class="number-game"><div class="number-win"><div class="eyebrow">You got it</div><h1>That’s my guy.</h1><p>The clever part was how you got there. The two of you always came at the puzzle from different angles.</p><button class="btn" id="number-back">Back to the family room</button></div></section>`;root.querySelector<HTMLButtonElement>("#number-back")!.onclick=()=>closeMinigame(this);};
    root.innerHTML=""; render();
  }
  colorPuzzle(m: Marker, entry: StoryData["optionalMemories"][number]) {
    setModalOpen(true);
    const colors = [
      { id: "orange", label: "Burnt orange", color: "#bd6337" },
      { id: "gold", label: "Warm gold", color: "#d8ad61" },
      { id: "blue", label: "Bright blue", color: "#2981c0" },
    ];
    const slots: (string | null)[] = [null, null, null];
    let selected = "";
    const render = () => {
      root.innerHTML = `<article class="panel wide"><div class="eyebrow">A wedding-day keepsake</div><h2>Put the colors back together</h2><p>Tap a color, then tap a place for it. Think about the little details that made the fall wedding feel like yours.</p><div class="palette-board"><div class="palette-slot" data-slot="0"><small>THE RUNNER</small>${slots[0] ? colors.find(c=>c.id===slots[0])!.label : "Tap to place"}</div><div class="palette-slot" data-slot="1"><small>THE FLOWERS</small>${slots[1] ? colors.find(c=>c.id===slots[1])!.label : "Tap to place"}</div><div class="palette-slot" data-slot="2"><small>THE SUITS</small>${slots[2] ? colors.find(c=>c.id===slots[2])!.label : "Tap to place"}</div></div><div class="palette-tray">${colors.map(c=>`<button class="palette-chip ${selected===c.id?"selected":""}" data-color="${c.id}"><i style="background:${c.color}"></i>${c.label}</button>`).join("")}</div><p class="small">You can move colors around until the whole scene feels right.</p><div class="actions"><button class="btn" id="palette-check">Set the palette</button><button class="btn secondary" id="palette-leave">Leave for now</button></div></article>`;
      root.querySelectorAll<HTMLButtonElement>("[data-color]").forEach(b=>b.onclick=()=>{selected=b.dataset.color!;render();});
      root.querySelectorAll<HTMLElement>("[data-slot]").forEach(s=>s.onclick=()=>{if(!selected)return; const i=Number(s.dataset.slot); const old=slots.indexOf(selected); if(old>=0) slots[old]=null; slots[i]=selected; selected=""; render();});
      root.querySelector<HTMLButtonElement>("#palette-leave")!.onclick=()=>closeMinigame(this);
      root.querySelector<HTMLButtonElement>("#palette-check")!.onclick=()=>{
        if(slots.every(Boolean) && slots.join(",")==="orange,gold,blue") {
          this.completeMarker(m,entry.memory); this.unlockAchievement(entry.achievement);
          const photoPath="/assets/photos/wedding/wedding-reception.jpg";
          void fetch(photoPath,{method:"HEAD"}).then(res=>{
            const photo=res.ok?`<img class="memory-photo" src="${photoPath}" alt="Wedding reception lights and table details">`:`<p class="small">Add <span class="mark">public/assets/photos/wedding/wedding-reception.jpg</span> to show your reception photo here.</p>`;
            panel("The colors come back",`<div class="eyebrow">A little piece of the day</div><h2>There it is.</h2><p>The orange, the warm flowers, and Aaron’s bright blue suit—somehow they all belong in the same picture.</p>${photo}`,[{label:"Back to the wedding",action:()=>this.refreshHud()}]);
          }).catch(()=>panel("The colors come back",`<div class="eyebrow">A little piece of the day</div><h2>There it is.</h2><p>The orange, the warm flowers, and Aaron’s bright blue suit—somehow they all belong in the same picture.</p><p class="small">Add <span class="mark">public/assets/photos/wedding/wedding-reception.jpg</span> to show your reception photo here.</p>`,[{label:"Back to the wedding",action:()=>this.refreshHud()}]));
        }
        else toast(slots.some(x=>!x)?"Fill each place first.":"Not quite. Try arranging the pieces another way.");
      };
    };
    render();
  }
  completeMarker(m: Marker, text: string) {
    m.done = true;
    const markerIndex = this.markers.indexOf(m);
    (this.markerObjects[markerIndex * 3] as any)?.setVisible(false);
    (this.markerObjects[markerIndex * 3 + 1] as any)?.setVisible(false);
    this.markerTexts[markerIndex]?.setText(`✓ ${m.label}`).setColor("#c5e1ad");
    this.addMemory(text);
    const unlock = (id: string) => {
      const next = this.markers.find((item) => item.id === id);
      if (next) next.active = true;
    };
    if (this.levelIndex === 1) {
      const next: Record<string, string> = {
        maid: "bridesmaids",
        bridesmaids: "photographer",
        photographer: "coordinator",
        coordinator: "church",
        church: "guardian",
      };
      if (next[m.id]) unlock(next[m.id]);
    }
    if (this.levelIndex === 0 && m.id === "carrom") {
      unlock("replay-carrom");
      const replay = this.markers.find((item) => item.id === "replay-carrom");
      if (replay) replay.active = true;
    }
    if (this.levelIndex === 0) {
      const next: Record<string, string> = { sandwich: "conversation", conversation: "second-date", "second-date": "breakup-boss" };
      if (next[m.id]) unlock(next[m.id]);
    }
    if (this.levelIndex === 2) {
      const next: Record<string, string> = {
        pregnancy: "inventory",
        inventory: "family-timeline",
        "family-timeline": "toybox",
        toybox: "after-bedtime",
        "after-bedtime": "midnight",
        midnight: "quiet",
      };
      if (next[m.id]) unlock(next[m.id]);
    }
    if (this.levelIndex === 3) {
      const next: Record<string, string> = { season: "house", house: "invisible-load", "invisible-load": "clearing" };
      if (next[m.id]) unlock(next[m.id]);
      if (m.id === "season") unlock("winter-memory");
    }
    if (this.levelIndex === 4) {
      const next: Record<string, string> = {
        callback: "echo",
        echo: "guard",
        guard: "choice",
      };
      if (next[m.id]) unlock(next[m.id]);
    }
    this.refreshHud();
    this.save();
  }
  maybePortal() {
    if (
      this.markers
        .filter((m) => ["sandwich", "conversation", "second-date", "breakup-boss"].includes(m.id))
        .every((m) => m.done)
    ) {
      this.portalReady = true;
      toast("The first-date memories open a Heartlight path.");
      this.completeLevel("Memory Echo", "Discovery");
    }
  }
  levelOne(m: Marker) {
    if (m.id === "sandwich") {
      const stage = (speaker: string, line: string, choices: { label: string; action: () => void; kind?: string }[], focus: "aaron" | "raiven" = "aaron", heading = "A little less nervous") => coupleScene(
        "Jersey Mike’s · imagined first-date dialogue",
        heading,
        speaker,
        line,
        choices,
        focus,
        "/assets/photos/memories/first-date.jpg",
      );
      const finishMeet = () => {
        this.completeMarker(m, "First date: Chipotle was the plan, Jersey Mike’s was the stop, and then you walked through Heritage Park together.");
        panel("The date begins", `<div class="eyebrow">June 2020 · Jersey Mike’s</div><h2>Sandwiches, then a walk.</h2><p>Chipotle was the plan. Somehow the first stop turned into Jersey Mike’s. The sandwich wasn’t great, but the date was.</p><p class="sub">The carrom table is waiting nearby if you want to play the whole first-date match. The story continues after your first meeting and the conversation that followed.</p>`, [{ label: "Back to the park", action: () => this.maybePortal() }]);
      };
      const choosePlan = () => stage("Aaron", "The sandwiches are sorted. What sounds good now?", [
        { label: "Grab lunch, then follow the park path", action: finishMeet },
        { label: "Take a little walk first", kind: "secondary", action: finishMeet },
      ], "aaron", "Lunch and a walk");
      stage("Aaron", "Raiven steps out from Jersey Mike’s. You’re trying to look calmer than you feel. What do you say?", [
        { label: "Hey. I’m really glad you’re here.", action: () => stage("Raiven", "Me too. I was starting to worry the sandwich plan was going to beat us here.", [{ label: "Ask if she wants to walk", action: choosePlan }], "raiven", "She breaks the ice") },
        { label: "I practiced saying hi in the car. It went better in the car.", kind: "secondary", action: () => stage("Raiven", "Good. So it’s not just me. Lunch first, then we can figure out the rest as we go.", [{ label: "Suggest a walk after lunch", action: choosePlan }], "raiven", "She laughs") },
      ], "aaron", "The first hello");
    }
    if (m.id === "carrom") {
      startCarromGame(this, m);
    }
    if (m.id === "conversation") {
      const reply = (line: string, topic: string) => coupleScene(
        "Heritage Park · imagined dialogue based on your real conversation",
        "And you keep talking",
        "Raiven",
        line,
        [{ label: "Stay a little longer", action: () => {
          this.completeMarker(m, `On the first date, the conversation turned to faith, church, and the family you both hoped for. Aaron asked about ${topic}.`);
          this.maybePortal();
        } }],
        "raiven",
      );
      coupleScene(
        "June 2020 · Heritage Park · imagined dialogue",
        "The conversation keeps going",
        "Aaron",
        "One question turns into a long talk about faith, church, and the future. What do you ask her?",
        [
          { label: "What does faith look like in the everyday stuff?", action: () => reply("I want it to be part of the ordinary parts of life, too.", "what faith looked like day to day") },
          { label: "What did you imagine your family would be like?", kind: "secondary", action: () => reply("When I was little, I used to wonder what my kids would be like.", "what kind of family Raiven had always imagined") },
        ],
      );
    }
    if (m.id === "second-date") {
      const completeDate = (answer: string) => coupleScene(
        "June 2020 · second date · imagined game dialogue",
        "Okay, meet the parents first",
        "Raiven",
        answer,
        [{ label: "Keep walking together", action: () => { this.completeMarker(m, "Second date: a walk that became a hike, frozen yogurt, and Aaron asking to make things official early. Raiven wanted him to meet her parents first."); this.unlockAchievement("MOVING A LITTLE FAST"); this.maybePortal(); } }],
        "raiven",
        "/assets/realm-1-park-side.png",
      );
      coupleScene("June 2020 · second date · imagined game dialogue", "A walk that turned into a hike", "Raiven", "You did call this a walk, right? Because I’m pretty sure we’re hiking now.", [
        { label: "The frozen yogurt was part of the route planning.", action: () => coupleScene("The second date", "One small question", "Aaron", "I like spending time with you. Would you want to make this official?", [
          { label: "I’d like that—after you meet my parents.", action: () => completeDate("I’d like that. Let’s have you meet my parents first.") },
          { label: "You move fast, Aaron.", kind: "secondary", action: () => completeDate("You move fast, Aaron. Meet my parents first, then we’ll talk.") },
        ], "aaron") },
        { label: "I promise the next walk is flatter.", kind: "secondary", action: () => coupleScene("The second date", "One small question", "Aaron", "I like spending time with you. Would you want to make this official?", [
          { label: "I’d like that—after you meet my parents.", action: () => completeDate("I’d like that. Let’s have you meet my parents first.") },
          { label: "You move fast, Aaron.", kind: "secondary", action: () => completeDate("You move fast, Aaron. Meet my parents first, then we’ll talk.") },
        ], "aaron") },
      ], "raiven");
    }
    if (m.id === "breakup-boss") {
      breakupBossPlatformer({ root, toast, close: () => closeMinigame(this) }, () => {
        coupleScene(
          "The space between the second date and the next chapter · imagined dialogue",
          "Some time apart. Then, a way back.",
          "Aaron",
          "We did part ways for a while. I remember thinking I had to accept that and keep moving. Then we found each other again on Upward, after deciding to try being friends first.",
          [
            { label: "We had more growing to do", action: () => coupleScene("A little later · finding each other again", "I’m glad we tried again", "Raiven", "Me too. We came back to it with a little more honesty and a better idea of what we wanted.", [{ label: "Keep choosing the next right step", action: () => { this.completeMarker(m, "The breakup becomes the first realm’s boss: Aaron climbs through doubt, timing, and unsaid words, then remembers that the two of them parted ways for a while before reconnecting on Upward and choosing a healthier start."); this.unlockAchievement("FOUND OUR WAY BACK"); this.maybePortal(); } }], "raiven", "/assets/realm-1-park-side.png") },
            { label: "I’m thankful the story kept going", kind: "secondary", action: () => coupleScene("A little later · finding each other again", "I’m glad we tried again", "Raiven", "Me too. We came back to it with a little more honesty and a better idea of what we wanted.", [{ label: "Keep choosing the next right step", action: () => { this.completeMarker(m, "The breakup becomes the first realm’s boss: Aaron climbs through doubt, timing, and unsaid words, then remembers that the two of them parted ways for a while before reconnecting on Upward and choosing a healthier start."); this.unlockAchievement("FOUND OUR WAY BACK"); this.maybePortal(); } }], "raiven", "/assets/realm-1-park-side.png") },
          ],
          "aaron",
          "/assets/realm-1-park-side.png",
        );
      });
      return;
    }
  }
  levelTwo(m: Marker) {
    if (m.id === "church") {
      if (!m.done) weddingSearch(this, m);
      return;
    }
    if (m.id === "vows") {
      if (!this.vowsUnlocked) {
        toast("The vows are still ahead, just past the wedding jitters.");
        return;
      }
      showVows();
      return;
    }
    if (m.id === "guardian") {
      if (!this.markers.find((x) => x.id === "church")?.done) {
        toast("Find the wedding-day keepsakes first.");
        return;
      }
      if (!m.done) aisleRun(this, m);
    }
  }
  levelThree(m: Marker) {
    if (m.id === "pregnancy") {
      const finish=(line:string)=>familyDialogueScene("A little later · Naomi’s first day · imagined dialogue","Hello, Naomi","Aaron","She’s so tiny. I can’t believe we get to take her home.",[
        {label:"I’m going to learn all the buttons on this car seat.",action:()=>{this.completeMarker(m,"The Beautiful Chaos opens with Raiven’s positive pregnancy test, then Naomi’s arrival and Aaron meeting his daughter for the first time.");this.addMemory(line);toast("The first little heartbeat is in your arms now.");}},
        {label:"I already love this little person so much.",kind:"secondary",action:()=>{this.completeMarker(m,"The Beautiful Chaos opens with Raiven’s positive pregnancy test, then Naomi’s arrival and Aaron meeting his daughter for the first time.");this.addMemory(line);toast("The first little heartbeat is in your arms now.");}},
      ],"/assets/scenes/pregnancy-reveal.png");
      const response=(line:string)=>coupleScene("Beautiful Chaos · the first pregnancy · imagined dialogue","A new little future","Raiven",line,[{label:"Hold her close",action:()=>finish("The first pregnancy announcement, followed by the day Aaron met Naomi and became a dad.")}],"raiven","/assets/scenes/pregnancy-reveal.png");
      coupleScene("Beautiful Chaos · after the wedding · imagined dialogue","The first little heartbeat","Raiven","I took the test twice. I think we’re going to have a baby.",[
        {label:"Wait—really? I’m going to be a dad?",action:()=>coupleScene("The first pregnancy · imagined dialogue","I’m going to be a dad","Aaron","I’m happy. I’m a little stunned. Mostly I want to hug you.",[{label:"Tell me what you’re thinking",action:()=>response("That’s what I was hoping you’d say. I’m excited—and yes, a little stunned too.")}],"aaron","/assets/scenes/pregnancy-reveal.png")},
        {label:"Come here. We’ll figure it out together.",kind:"secondary",action:()=>coupleScene("The first pregnancy · imagined dialogue","One step at a time","Aaron","I don’t have the whole plan yet. But I know I want to do this with you.",[{label:"Tell me what you’re thinking",action:()=>response("Me too. One step at a time. I can’t believe we’re going to be somebody’s parents.")}],"aaron","/assets/scenes/pregnancy-reveal.png")},
      ],"aaron","/assets/scenes/pregnancy-reveal.png");
      return;
    }
    if (m.id === "inventory") {
      if(!this.markers.find(x=>x.id==="pregnancy")?.done){toast("Start with the first little heartbeat.");return;}
      if(!m.done)familyPackGame(this,m);return;
    }
    if (m.id === "family-timeline") {
      if(!this.markers.find(x=>x.id==="inventory")?.done){toast("Get the family outing bag ready first.");return;}
      let stage=0;
      const photoNaomi="/assets/photos/family/family-with-mom.jpg",photoFamily="/assets/photos/family/family-with-everyone.jpg";
      const finish=()=>{this.completeMarker(m,"A chronological family timeline moves through Naomi and Matthew as babies, Naomi as a toddler, Maliyah’s arrival, Matthew and Maliyah as toddlers, and Naomi as a preschooler.");this.unlockAchievement("THEY GROW SO FAST");};
      const show=()=>{
        const next=()=>{stage++;show();};
        if(stage===0){familyDialogueScene("Family timeline · Naomi’s baby days · imagined dialogue","The first tiny days","Raiven","The nurses were showing you how to change a diaper, and you were taking the lesson very seriously.",[
          {label:"There are more tabs than I expected.",action:next},{label:"I’m learning. I’ve got her.",kind:"secondary",action:next},
        ],photoNaomi);return;}
        if(stage===1){familyDialogueScene("Family timeline · Matthew’s baby days · imagined dialogue","A new little brother","Raiven","Then Matthew arrived, and the house got even smaller in the sweetest way. Suddenly there were tiny socks in every room.",[
          {label:"I still don’t know how socks disappear that fast.",action:next},{label:"We needed a whole drawer just for the little clothes.",kind:"secondary",action:next},
        ],photoFamily);return;}
        if(stage===2){familyDialogueScene("Naomi · toddler · imagined dialogue","She knows where everything is","Naomi","Dada, you left your keys on the table again.",[
          {label:"Good catch, bug. You’re my lost-and-found.",action:next},{label:"I was about to ask you where they were.",kind:"secondary",action:next},
        ],photoNaomi);return;}
        if(stage===3){familyDialogueScene("Family timeline · Maliyah’s baby days · imagined dialogue","One more little heartbeat","Raiven","And then Maliyah joined us. Her brother and sister wanted to help with everything.",[
          {label:"They were so proud to be the big kids.",action:next},{label:"They had a lot of advice for us, too.",kind:"secondary",action:next},
        ],photoFamily);return;}
        if(stage===4){familyDialogueScene("Matthew · toddler · imagined dialogue","Outside with Dad","Matthew","He grabs your hand and says, ‘Come on, Dad. Let’s go!’",[
          {label:"You lead the way, buddy.",action:()=>familyDialogueScene("Matthew · toddler · imagined dialogue","He has the route","Matthew","He takes three confident steps, then looks back to make sure you’re still right there.",[{label:"I’m right behind you.",action:next}],photoFamily)},
          {label:"Should we bring your sister along?",kind:"secondary",action:()=>familyDialogueScene("Matthew · toddler · imagined dialogue","He has the route","Matthew","He takes three confident steps, then looks back to make sure you’re still right there.",[{label:"I’m right behind you.",action:next}],photoFamily)},
        ],photoFamily);return;}
        if(stage===5){familyDialogueScene("Maliyah · toddler · imagined dialogue","I do it","Maliyah","She points at the toy in your hand. ‘I do it!’",[
          {label:"Okay, boss. Show me how it’s done.",action:()=>familyDialogueScene("Maliyah · toddler · imagined dialogue","One determined little step","Maliyah","She takes it, grins, then reaches for your hand anyway.",[{label:"Walk beside her",action:next}],photoFamily)},
          {label:"I’ll walk next to you, just in case.",kind:"secondary",action:()=>familyDialogueScene("Maliyah · toddler · imagined dialogue","One determined little step","Maliyah","She takes it, grins, then reaches for your hand anyway.",[{label:"Walk beside her",action:next}],photoFamily)},
        ],photoFamily);return;}
        if(stage===6){familyDialogueScene("Naomi · preschooler · imagined dialogue","Crusty dusty","Naomi","Dada, you’re crusty dusty!",[
          {label:"That’s fair. Where’s my shirt?",action:()=>familyDialogueScene("Naomi · preschooler · imagined dialogue","She has notes","Raiven","She has been waiting all morning to tell you that.",[{label:"I’m going to need the full report.",action:finish}],photoFamily)},
          {label:"I thought I was looking pretty fresh.",kind:"secondary",action:()=>familyDialogueScene("Naomi · preschooler · imagined dialogue","She has notes","Raiven","She has been waiting all morning to tell you that.",[{label:"I’m going to need the full report.",action:finish}],photoFamily)},
        ],photoFamily);return;}
      };
      show();return;
    }
    if (m.id === "toybox") {
      if(!this.markers.find(x=>x.id==="family-timeline")?.done){toast("Follow Naomi, Matthew, and Maliyah as they grow first.");return;}
      if(!m.done)toyboxCleanup(this,m);return;
    }
    if (m.id === "after-bedtime") {
      if(!this.markers.find(x=>x.id==="family-timeline")?.done){toast("Meet the kids along the timeline first.");return;}
      const reply=(line:string)=>coupleScene("Beautiful Chaos · after bedtime · imagined dialogue","A minute to ourselves","Raiven",line,[{label:"Stay close a little longer",action:()=>this.completeMarker(m,"After the kids are finally asleep, Aaron and Raiven steal a quiet minute together. The house is still for now; tomorrow it will be loud again.")}],"raiven","/assets/realm-3-home.jpg");
      coupleScene("Beautiful Chaos · after bedtime · imagined dialogue","A minute to ourselves","Raiven","Remember when our big date plan was sandwiches and a walk? Now I have three little people yelling ‘Mom!’ from different rooms.",[
        {label:"I like our loud little life.",action:()=>reply("Me too. Even when I have to ask which room they’re yelling from.")},
        {label:"We should put ‘quiet’ on the family calendar.",kind:"secondary",action:()=>reply("Sure. Right between snack time and somebody needing a new outfit.")},
      ],"aaron","/assets/realm-3-home.jpg");return;
    }
    if (m.id === "midnight") {
      if(!this.markers.find(x=>x.id==="after-bedtime")?.done){toast("Steal a quiet minute together before the night shift.");return;}
      if(!m.done)midnightRun(this,m);return;
    }
    if (m.id === "quiet") {
      if(!this.markers.find(x=>x.id==="midnight")?.done){toast("The morning comes after the night shift.");return;}
      const finish=()=>{this.completeMarker(m,"A slow morning with Naomi, Matthew, and Maliyah piling into the family bed. Nobody is ready to get up just yet.");this.completeLevel("Together","Joy");};
      const maliyah=()=>familyDialogueScene("A slow morning · Maliyah · imagined dialogue","There’s room for one more","Maliyah","She wedges into your lap with a grin. ‘Me too, Dad!’",[{label:"Come here, you little cuddle thief.",action:finish},{label:"You’re the boss of this pile, then.",kind:"secondary",action:finish}],"/assets/photos/family/family-with-mom.jpg");
      const matthew=()=>familyDialogueScene("A slow morning · Matthew · imagined dialogue","The truck book","Matthew","He brings you the truck book and leaves a space open beside him.",[{label:"Read the whole thing, voices and all.",action:maliyah},{label:"You pick the page.",kind:"secondary",action:maliyah}],"/assets/photos/family/family-with-everyone.jpg");
      familyDialogueScene("A slow morning · Naomi · imagined dialogue","The sun is up","Naomi","She climbs into the middle of the bed and asks if everybody can stay there just a little longer.",[{label:"I think we can spare five minutes.",action:matthew},{label:"Only if everyone gets under the blanket.",kind:"secondary",action:matthew}],"/assets/photos/family/family-with-mom.jpg");return;
    }
  }
  levelFour(m: Marker) {
    if (m.id === "season") {
      if (!m.done) seasonPathGame(this, m);
      return;
    }
    if (m.id === "house") {
      coupleScene("Ypsilanti · May 2022 · imagined game dialogue","The first summer in this house","Raiven","I didn’t fall in love with this house right away. It smelled like dogs, and there was so much to fix.",[
        {label:"We kept making it ours, one project at a time.",action:()=>coupleScene("The changing house · imagined dialogue","One room at a time","Aaron","The floors, the carpet, the kitchen, the fireplace… we kept building a home in it.",[{label:"Keep going together",action:()=>{this.completeMarker(m,"The Ypsilanti home became theirs one project and one memory at a time: floors, carpet, kitchen, fireplace, archway, and a growing family.");this.unlockAchievement("MADE A HOME");}}],"aaron","/assets/realm-4-seasons.jpg")},
        {label:"I think the house finally won you over.",kind:"secondary",action:()=>coupleScene("The changing house · imagined dialogue","One room at a time","Aaron","The floors, the carpet, the kitchen, the fireplace… we kept building a home in it.",[{label:"Keep going together",action:()=>{this.completeMarker(m,"The Ypsilanti home became theirs one project and one memory at a time: floors, carpet, kitchen, fireplace, archway, and a growing family.");this.unlockAchievement("MADE A HOME");}}],"aaron","/assets/realm-4-seasons.jpg")},
      ],"raiven","/assets/realm-4-seasons.jpg");return;
    }
    if (m.id === "invisible-load") {
      invisibleLoadPlatformer({ root, toast, close: () => {
        closeMinigame(this);
        // The load challenge uses its own four-floor scaffold. Return the
        // Phaser character to the clear lower route before resuming Level 4.
        // Land on the broad lower route between the two nearby ledges, beside
        // the next story marker, so Aaron never resumes beneath a platform.
        const safeX = 2230, safeY = 690;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        this.player.setPosition(safeX, safeY).setRotation(0);
        body.enable = true;
        body.reset(safeX, safeY);
        body.setVelocity(0, 0).setAcceleration(0, 0);
        this.checkpointX = Math.max(this.checkpointX, safeX);
        this.cameras.main.centerOn(safeX, safeY);
        this.save();
      } }, () => {
        coupleScene("Through Every Season · after the full day · imagined dialogue", "That was a lot to hold", "Aaron", "I kept moving from one thing to the next, and I can see how much of that list you carry without anyone asking.", [
          { label: "I need to take more of it on without waiting to be asked", action: () => coupleScene("Through Every Season · a real conversation", "Coffee isn’t the whole answer", "Raiven", "Coffee got you through the day. It doesn’t make the work disappear, and I don’t want us to pretend one good day fixes the pattern.", [{ label: "Let’s make a plan and keep checking in", action: () => { this.completeMarker(m, "The Invisible Load challenge has Aaron balance eight household tasks, repeat potty and diaper care, and intentional play while the kids move through the house and sometimes undo a finished chore. The follow-up names accountability and shared work; coffee helps for a moment, but it does not solve the uneven load."); this.unlockAchievement("SHARED WORK, SHARED HOME"); } }], "raiven", "/assets/realm-4-seasons.jpg") },
          { label: "Show me what I’ve been missing", kind: "secondary", action: () => coupleScene("Through Every Season · a real conversation", "Let’s keep talking about it", "Raiven", "I can tell you what’s on my mind. I need you to keep noticing it too, and to follow through after we talk.", [{ label: "I’ll keep showing up for the work", action: () => { this.completeMarker(m, "The Invisible Load challenge has Aaron balance eight household tasks, repeat potty and diaper care, and intentional play while the kids move through the house and sometimes undo a finished chore. The follow-up names accountability and shared work; coffee helps for a moment, but it does not solve the uneven load."); this.unlockAchievement("SHARED WORK, SHARED HOME"); } }], "raiven", "/assets/realm-4-seasons.jpg") },
        ], "aaron", "/assets/realm-4-seasons.jpg");
      });
      return;
    }
    if (m.id === "winter-memory") {
      if (!this.markers.find((x) => x.id === "season")?.done) {
        toast(
          "The snow still covers the page. Open the seasonal crossing first.",
        );
        return;
      }
      const keepPage = () => {
        this.completeMarker(m, "Winter echo: the original vows take on deeper meaning through real life. Grace and forgiveness can coexist with honesty, accountability, and rebuilding trust.");
        toast("You tuck the page safely into the journal.");
      };
      coupleScene(
        "Optional winter memory · words from 2021",
        "A line beneath the snow",
        "From Raiven’s original vows",
        "I promise to not put the weight of our circumstances on you but to always lay it at the feet of Jesus.",
        [{ label: "Turn the page", action: () => coupleScene("Optional winter memory · original vows", "And one more line", "From Raiven’s original vows", "I vow to always extend to you the grace, mercy, and forgiveness that the Lord has poured out over me.", [{ label: "Keep the page", action: () => coupleScene("A quiet moment in winter", "The work is still real", "Aaron · your choice", "You know these words don’t make the hard parts disappear. You can hold on to grace and still keep doing the honest work of rebuilding.", [{ label: "Walk on together", action: keepPage }], "aaron", "/assets/realm-4-seasons.jpg") }], "raiven", "/assets/realm-4-seasons.jpg") }], "raiven", "/assets/realm-4-seasons.jpg");
    }
    if (m.id === "clearing") {
      if(!this.markers.find(x=>x.id==="season")?.done){toast("The four seasons must be aligned first.");return;}
      if(!this.markers.find(x=>x.id==="house")?.done){toast("Walk through the first summer in your home before crossing the clearing.");return;}
      if(!this.markers.find(x=>x.id==="invisible-load")?.done){toast("Face the full-day household challenge before the clearing opens.");return;}
      const finish=()=>{this.completeMarker(m,"The four-season clearing holds both the hard parts and the new growth. Hope does not erase hurt.");this.completeLevel("Steadfast","Perseverance");};
      coupleScene("Through Every Season · imagined game dialogue","Still here, still growing","Aaron","The hard parts are still part of our story. So is the little bit of green coming up through the snow.",[
        {label:"We can keep doing the honest work.",action:()=>coupleScene("Through Every Season · imagined game dialogue","A little space for hope","Raiven","Yeah. We don’t have to pretend it’s easy to keep making room for what could still grow.",[{label:"Walk on together",action:finish}],"raiven","/assets/realm-4-seasons.jpg")},
        {label:"I want to keep choosing the next right step.",kind:"secondary",action:()=>coupleScene("Through Every Season · imagined game dialogue","A little space for hope","Raiven","Yeah. We don’t have to pretend it’s easy to keep making room for what could still grow.",[{label:"Walk on together",action:finish}],"raiven","/assets/realm-4-seasons.jpg")},
      ],"aaron","/assets/realm-4-seasons.jpg");return;
    }
  }
  levelFive(m: Marker) {
    if (m.id === "callback") {
      coupleScene("October 23, 2021 · the same folded page · imagined game dialogue","A familiar piece of paper","Aaron",story.levelFiveCallback,[
        {label:"I still want to write the next page with you.",action:()=>coupleScene("The Next Adventure · imagined dialogue","What those words mean now","Raiven","They feel different now. We’ve learned how much it takes to live them, and I still want to keep going with you.",[{label:"Turn the page together",action:()=>{this.completeMarker(m,"Level 5 callback: the familiar vow document returns. The new line ‘We didn’t know everything those promises would ask of us’ leads toward Choice.");this.vowsUnlocked=true;this.markers.find(x=>x.id==="echo")!.active=true;}}],"raiven","/assets/realm-5-choice.jpg")},
        {label:"Look at how far we’ve come.",kind:"secondary",action:()=>coupleScene("The Next Adventure · imagined dialogue","What those words mean now","Raiven","They feel different now. We’ve learned how much it takes to live them, and I still want to keep going with you.",[{label:"Turn the page together",action:()=>{this.completeMarker(m,"Level 5 callback: the familiar vow document returns. The new line ‘We didn’t know everything those promises would ask of us’ leads toward Choice.");this.vowsUnlocked=true;this.markers.find(x=>x.id==="echo")!.active=true;}}],"raiven","/assets/realm-5-choice.jpg")},
      ],"aaron","/assets/realm-5-choice.jpg");return;
    }
    if (m.id === "echo") {
      if (!this.markers.find((x) => x.id === "callback")?.done) {
        toast("The familiar paper is part of the path forward.");
        return;
      }
      if (!m.done) {
        this.completeMarker(m, "Memory Echo reveals the familiar path in the vow paper and carries the memory into the final realm.");
        toast("Memory Echo reveals the crossing. Promise Guard is next.");
        return;
      }
      return;
    }
    if (m.id === "guard") {
      if (!this.markers.find((x) => x.id === "echo")?.done) {
        toast("Use Memory Echo to find what the stone remembers.");
        return;
      }
      this.selectAbility("Promise Guard");
      this.completeMarker(m, "Promise Guard is readied before the final encounter; commitment becomes an action that protects the next step.");
      toast("Promise Guard is ready. The next page is open.");
      return;
    }
    if (m.id === "choice") {
      if (!this.markers.find((x) => x.id === "guard")?.done) {
        toast("The next page opens after the crossing.");
        return;
      }
      const chooseTogether = () => coupleScene(
        "The Next Adventure · imagined game dialogue",
        "One more page",
        "Raiven",
        "Me too. I want all the next parts with you.",
        [{ label: "Open your letter", action: () => {
          this.completeMarker(m, "The fifth fragment, Choice: an ongoing decision to keep writing the story together.");
          this.fragments = 5;
          this.save();
          this.completeLevel("Choice", "The Next Adventure");
        } }],
        "raiven",
        "/assets/realm-5-choice.jpg",
      );
      coupleScene(
        "The Next Adventure · Aaron’s point of view",
        "Still my favorite person",
        "Aaron",
        "From that not-great sandwich to this loud, lovely life—we’ve come a long way. I still want to see what comes next with you.",
        [
          { label: "Turn the page together", action: chooseTogether },
          { label: "I choose you for the next chapter", kind: "secondary", action: chooseTogether },
        ],
        "aaron",
        "/assets/realm-5-choice.jpg",
      );
    }
  }
  completeLevel(ability: string, theme: string) {
    if (this.completed) return;
    this.completed = true;
    this.fragments = Math.max(this.fragments, this.levelIndex + 1);
    if (!this.abilities.includes(ability)) this.abilities.push(ability);
    this.activeAbility = ability;
    this.refreshHud();
    const final = this.levelIndex === 4;
    const gateId = final ? "epilogue-gate" : "exit";
    if (!this.markers.some((m) => m.id === gateId)) {
      this.addMarker(
        gateId,
        final ? "Open the anniversary letter" : "Step through the Heartlight",
        this.worldW - 150,
        840,
      );
    }
    this.save();
    panel(
      final ? "Choice found" : `${theme} fragment recovered`,
      `<div class="eyebrow">Heartlight fragment ${Math.min(5, this.fragments)} of 5</div><h2>${final ? "The Heartlight is whole." : "You learned " + esc(ability) + "."}</h2><p>${final ? "The fantasy realm and the life behind it become one. The story continues into the anniversary epilogue." : "This ability carries into later realms and has a practical use in play."}</p><p class="small">Abilities stay unlocked: ${this.abilities.map(esc).join(" · ")}.</p>`,
      [
        {
          label: final ? "Read the anniversary letter" : "Enter the next realm",
          action: () => {
            if (final) {
              this.completed = true;
              this.save();
              const audio = document.getElementById(
                "ambience",
              ) as HTMLAudioElement | null;
              if (audio) audio.volume = 0.1;
              epilogue(this);
            } else this.loadLevel(this.levelIndex + 1);
          },
        },
        {
          label: "Keep exploring for memories",
          kind: "secondary",
          action: () => toast("The exit stays open. Gather any optional memories before you go."),
        },
      ],
    );
  }
  defeatAllEnemies() {
    this.enemies.getChildren().forEach((e: any) => e.destroy());
  }
  attack() {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 0.28;
    this.swingTimer = 0.18;
    const facing = this.player.flipX ? -1 : 1;
    const slash = this.add.graphics().setDepth(7);
    slash.lineStyle(8, 0xffe1a0, 0.88);
    slash.beginPath();
    slash.arc(this.player.x + facing * 30, this.player.y - 1, 58, facing < 0 ? 2.9 : 0.2, facing < 0 ? 4.65 : 2.95, false);
    slash.strokePath();
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.2, duration: 170, onComplete: () => slash.destroy() });
    let hit = false;
    this.enemies.getChildren().forEach((raw: any) => {
      const e = raw as Phaser.Physics.Arcade.Sprite;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * facing > -12 && dx * facing < 132 && Math.abs(dy) < 88) {
        hit = true;
        let hp = (e.getData("hp") || 1) - 1;
        e.setData("hp", hp);
        e.setVelocity(facing * 250, -155);
        this.cameras.main.shake(65, 0.0022);
        this.tweens.add({
          targets: e,
          x: e.x + facing * 22,
          y: e.y - 9,
          alpha: 0.4,
          yoyo: true,
          duration: 90,
        });
        if (hp <= 0) {
          e.destroy();
          toast("A toy-shadow pops into a harmless puff.");
        }
      }
    });
    if (!hit) toast("The swing misses. Face the foe and get within range.");
  }
  dodge() {
    if (this.dashTimer > 0) return;
    this.dashTimer = 0.48;
    const vx = this.player.body?.velocity.x || 0,
      vy = this.player.body?.velocity.y || 0;
    let dx = Math.sign(vx),
      dy = Math.sign(vy);
    if (!dx && !dy) dx = 1;
    this.player.setVelocity(dx * 520, dy * 520);
    this.player.setTint(0xffe0a0);
    this.time.delayedCall(210, () => this.player.clearTint());
    toast("Dodge");
  }
  selectAbility(name: string) {
    if (this.abilities.includes(name)) {
      this.activeAbility = name;
      this.refreshHud();
      toast(`${name} selected.`);
    } else toast(`${name} has not been unlocked yet.`);
  }
  special() {
    const ability = this.activeAbility;
    if (ability === "Memory Echo") {
      this.echoOn = !this.echoOn;
      this.markers.forEach((m) => {
        if (!m.done) {
          const t = this.markerTexts[this.markers.indexOf(m)];
          if (t) t.setAlpha(this.echoOn ? 1 : 0.75);
        }
      });
      toast(
        this.echoOn
          ? "Memory Echo reveals hidden traces."
          : "Memory Echo quiets.",
      );
      if (this.levelIndex === 4 && this.echoOn) {
        const marker = this.markers.find((m) => m.id === "echo");
        if (
          marker &&
          marker.active &&
          !marker.done &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            marker.x,
            marker.y,
          ) < 95
        )
          this.completeMarker(
            marker,
            "Memory Echo reveals the Heartlight traces along the hidden path.",
          );
      }
      return;
    }
    if (ability === "Promise Guard") {
      this.guardTimer = 1.25;
      this.player.setTint(0x9edbd3);
      this.time.delayedCall(350, () => this.player.clearTint());
      toast("Promise Guard — timed defense active");
      if (this.levelIndex === 4) {
        const marker = this.markers.find((m) => m.id === "guard");
        if (
          marker &&
          marker.active &&
          !marker.done &&
          Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            marker.x,
            marker.y,
          ) < 95
        ) {
          this.completeMarker(
            marker,
            "Promise Guard carries the player through the open crossing.",
          );
          toast("The next page is open.");
        }
      }
      return;
    }
    if (ability === "Together") {
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.tweens.add({
        targets: this.companion,
        scale: 1.6,
        duration: 260,
        yoyo: true,
        ease: "Back.Out",
      });
      const link = this.add
        .circle(this.player.x, this.player.y, 24, 0xf0d18a, 0.12)
        .setStrokeStyle(4, 0xffe6b6, 0.85)
        .setDepth(6);
      this.tweens.add({
        targets: link,
        scale: 3.2,
        alpha: 0,
        duration: 520,
        onComplete: () => link.destroy(),
      });
      this.refreshHud();
      toast("Together — your companion steadies you and restores one heart.");
      return;
    }
    if (ability === "Steadfast") {
      this.guardTimer = 1.2;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.player.setTint(0xc4dfab);
      this.time.delayedCall(350, () => this.player.clearTint());
      this.refreshHud();
      toast("Steadfast — recover and brace.");
      return;
    }
    toast("Unlock an ability before using Q.");
  }
  showGameOver(message: string) {
    if (this.gameOverShown) return;
    this.gameOverShown = true;
    this.pausedByMenu = true;
    this.physics.world.pause();
    panel(
      "Out of hearts",
      `<div class="eyebrow">Catch your breath</div><h2>That was a rough stretch.</h2><p>${esc(message)}</p><p class="small">Your story progress is safe. Pick up again at the last checkpoint, or leave the adventure for now.</p>`,
      [
        { label: "Retry from checkpoint", action: () => { this.physics.world.resume(); this.gameOverShown = false; this.pausedByMenu = false; this.hp = this.maxHp; this.player.setPosition(this.checkpointX, 660); (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0); this.refreshHud(); this.save(); } },
        { label: "Quit to title", kind: "secondary", action: () => { this.physics.world.resume(); this.gameOverShown = false; this.pausedByMenu = false; this.started = false; this.companion.setVisible(false); this.drawTitleWorld(); titleScreen(); } },
      ],
    );
  }
  update(_t: number, dt: number) {
    if (!this.started || modalOpen || this.pausedByMenu) {
      interactPrompt.classList.remove("show");
      return;
    }
    if (this.started && this.companion?.visible) {
      const targetX = this.player.x - 46;
      const targetY = this.player.y - 20 + Math.sin(this.time.now / 330) * 5;
      this.companion.x = Phaser.Math.Linear(this.companion.x, targetX, 0.08);
      this.companion.y = Phaser.Math.Linear(this.companion.y, targetY, 0.08);
    }
    if (this.time.now > this.hudAt) {
      this.hudAt = this.time.now + 160;
      this.refreshHud();
    }
    if (this.time.now > this.saveAt) {
      this.saveAt = this.time.now + 2500;
      this.save();
    }
    const alive = this.enemies.getChildren().filter((x: any) => x.active);
    if (
      this.guardianStarted &&
      !this.markers.find((m) => m.id === "guardian")?.done &&
      alive.length === 0
    ) {
      const g = this.markers.find((m) => m.id === "guardian");
      if (g) {
        this.completeMarker(
          g,
          "A storybook guardian clears the aisle; the ceremony can begin.",
        );
        ceremonySequence(this);
        return;
      }
    }
    const delta = dt / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dashTimer = Math.max(0, this.dashTimer - delta);
    this.guardTimer = Math.max(0, this.guardTimer - delta);
    this.swingTimer = Math.max(0, this.swingTimer - delta);
    if (this.player.y > 850) {
      this.player.setPosition(this.checkpointX, 660);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      toast("Back on the path.");
    }
    const checkpoint = this.courseCheckpoints.filter((x) => this.player.x >= x).pop();
    if (checkpoint && checkpoint > this.checkpointX) {
      this.checkpointX = checkpoint;
      toast("Checkpoint saved.");
      this.save();
    }
    if (this.dashTimer > 0) return;
    let dx = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx = -1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;
    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE))
      this.selectAbility("Memory Echo");
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO))
      this.selectAbility("Promise Guard");
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE))
      this.selectAbility("Together");
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR))
      this.selectAbility("Steadfast");
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    const ducking = this.keys.S.isDown && grounded;
    this.player.setScale(0.30, ducking ? 0.22 : 0.30);
    this.coyoteTime = grounded ? 0.12 : Math.max(0, this.coyoteTime - delta);
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.jumpBuffer = 0.16;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - delta);
    if (this.jumpBuffer > 0 && (grounded || this.coyoteTime > 0)) {
      body.setVelocityY(-600);
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
      this.player.anims.play("aaron-walk", true);
    }
    body.setMaxVelocityX(ducking ? 135 : 330);
    if (dx) body.setAccelerationX(dx * (ducking ? 1150 : 2350));
    else body.setAccelerationX(0).setDragX(2600);
    const jumpHeld = this.keys.SPACE.isDown || this.keys.W.isDown || this.cursors.up.isDown;
    if (!jumpHeld && body.velocity.y < -160) body.setVelocityY(body.velocity.y * 0.91);
    if (dx) {
      this.player.setFlipX(dx < 0).setRotation(0);
      if (grounded) this.player.anims.play("aaron-walk", true);
      if (this.time.now > this.stepAt) {
        this.stepAt = this.time.now + 145;
        const dust = this.add.circle(this.player.x - dx * 16, this.player.y + 26, Phaser.Math.Between(2, 4), 0xe9d2a5, 0.38).setDepth(4);
        this.tweens.add({ targets: dust, y: dust.y + 8, alpha: 0, duration: 260, onComplete: () => dust.destroy() });
      }
    } else if (!grounded) {
      this.player.anims.play("aaron-walk", true);
      this.player.setRotation(Phaser.Math.Clamp(body.velocity.x * 0.00032, -0.11, 0.11));
    } else {
      this.player.setRotation(0);
      this.player.anims.stop();
      this.player.setFrame(0);
    }
    this.enemies.getChildren().forEach((raw: any) => {
      const e = raw as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        e.x,
        e.y,
      );
      const range = 76;
      if (d > range) {
        const angle = Phaser.Math.Angle.Between(
          e.x,
          e.y,
          this.player.x,
          this.player.y,
        );
        e.setVelocity(
          Math.cos(angle) * 58,
          Math.sin(angle) * 58,
        );
      } else {
        e.setVelocity(0, 0);
        if (this.time.now > Number(e.getData("attackAt") || 0)) {
          e.setData("attackAt", this.time.now + 1450);
          const ring = this.add
            .circle(e.x, e.y, 54, 0xe87562, 0.16)
            .setStrokeStyle(3, 0xf5c078, 0.8)
            .setDepth(3);
          this.tweens.add({
            targets: ring,
            scale: 1.55,
            alpha: 0,
            duration: 560,
            onComplete: () => ring.destroy(),
          });
        }
      }
    });
  }
}
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1000,
  height: 640,
  backgroundColor: "#17271f",
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [KingdomScene],
  render: { antialias: true, roundPixels: false },
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOpen) {
    /* Esc never silently dismisses narrative text. */
  }
});
