import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch("http://127.0.0.1:4173/");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("Preview server did not start");
  const checks = [
    ["/", "text/html"],
    ["/story-data/story.json", "application/json"],
    ["/assets/audio/heartlight-ambience.wav", "audio/wav"],
    ["/assets/characters/aaron.png", "image/png"],
    ["/assets/characters/aaron-walk-sheet.png", "image/png"],
    ["/assets/characters/children-naomi-growth.png", "image/png"],
    ["/assets/characters/children-matthew-growth.png", "image/png"],
    ["/assets/characters/children-maliyah-growth.png", "image/png"],
    ["/assets/characters/raiven-dialogue.png", "image/png"],
    ["/assets/scenes/wedding-vows.png", "image/png"],
    ["/assets/scenes/pregnancy-reveal.png", "image/png"],
    ["/assets/scenes/family-moment.png", "image/png"],
    ["/assets/realm-1-park.jpg", "image/jpeg"],
    ["/assets/realm-2-wedding.jpg", "image/jpeg"],
    ["/assets/realm-3-home.jpg", "image/jpeg"],
    ["/assets/realm-4-seasons.jpg", "image/jpeg"],
    ["/assets/realm-5-choice.jpg", "image/jpeg"],
    ["/assets/realm-1-park-side.png", "image/png"],
    ["/assets/realm-2-wedding-side.png", "image/png"],
    ["/assets/realm-3-family-growth.png", "image/png"],
    ["/assets/realm-3-toy-room.png", "image/png"],
    ["/assets/characters/raiven-wedding-dialogue.png", "image/png"],
    ["/assets/photos/family/family-recent.jpg", "image/jpeg"],
    ["/assets/photos/family/family-with-everyone.jpg", "image/jpeg"],
    ["/assets/photos/family/family-with-mom.jpg", "image/jpeg"],
  ];
  let storyData;
  for (const [path, expected] of checks) {
    const response = await fetch(`http://127.0.0.1:4173${path}`);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes(expected))
      throw new Error(`${path} content type was ${contentType}`);
    const body = await response.arrayBuffer();
    console.log(`PASS ${path} · ${body.byteLength} bytes`);
    if (path.endsWith("story.json")) {
      const data = JSON.parse(new TextDecoder().decode(body));
      if (
        data.originalVows.length !== 13 ||
        !data.anniversaryLetter.includes("After five years, I still choose you") ||
        data.optionalMemories.length < 16 ||
        data.optionalMemories.some((item) => item.id === "seafood") ||
        data.optionalMemories.some((item) => item.id === "seafood") ||
        data.familyMembers.length !== 4
      )
        throw new Error("Story data is incomplete");
      storyData = data;
      console.log(
        `PASS story data · ${data.originalVows.length} vow paragraphs; ${data.optionalMemories.length} optional memories; anniversary declaration present`,
      );
    }
  }
  const source = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
  const platformSource = await readFile(new URL("../src/platform-games.ts", import.meta.url), "utf8");
  const htmlSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const required of [
    "Pack for the outing",
    "Restore the four-season calendar",
    "Find the five keepsakes",
    "Reach the wooden arch",
    "Carrom against the computer",
    "Crack the number",
    "Set the wedding colors",
    "OBJECTIVE",
    "CONTROLS",
    "Start challenge",
  ]) {
    if (!source.includes(required) && !platformSource.includes(required)) {
      throw new Error(`Missing minigame briefing: ${required}`);
    }
  }
  if (
    !platformSource.includes("let frameFn: ((time: number) => void) | undefined") ||
    !platformSource.includes("if (!disposed && started) raf = requestAnimationFrame(draw)") ||
    !source.includes("running = false, started = false") ||
    !source.includes("if (started && !complete && !defeated)") ||
    !source.includes('if(!started||ended||turn!=="raiven"||moving)return;')
  ) {
    throw new Error("Minigame timer or hazard logic is not gated behind Start");
  }
  console.log("PASS minigame briefings · objectives, controls, and start-gated clocks and hazards");
  if (storyData.optionalMemories.some((item) => item.id === "office") || source.includes('["side-office"')) {
    throw new Error("The removed Office of Shame memory is still available");
  }
  if (storyData.optionalMemories.some((item) => ["warmth", "honeymoon"].includes(item.id)) || source.includes('"side-warmth"') || source.includes('"handwarmer"') || /virgin strawberry daiquiri|mystery daiquiri|hand warmer/i.test(`${source}\n${JSON.stringify(storyData)}`)) {
    throw new Error("The removed Level 2 hand-warmer and daiquiri content is still available");
  }
  if (!source.includes("wedding-reception.jpg") || !source.includes("Array.from({length:10}") || !source.includes("/assets/photos/memories/honeymoon.jpg") || !source.includes("/assets/photos/memories/first-date.jpg") || !source.includes("/assets/photos/memories/proposal.jpg")) {
    throw new Error("Wedding, first-date, proposal, or honeymoon photos are not wired to their scenes");
  }
  if (source.includes('["boss", "The Unwritten"') || source.includes('id === "boss"') || source.includes("The Unwritten")) {
    throw new Error("The removed Level 5 uncertainty fight is still in the game");
  }
  if (!source.includes('addKeys("ONE,TWO,THREE,FOUR", false)') || !source.includes('id="number-input" type="number"')) {
    throw new Error("The number puzzle still blocks typed digits");
  }
  if (!source.includes("body.enable = false") || !source.includes("body.enable = true") || !source.includes("if (!this.started || modalOpen || this.pausedByMenu)")) {
    throw new Error("The main level does not fully pause behind minigames");
  }
  const bedtimeHitStart = platformSource.indexOf("if(hit&&cooldown===0&&n.cool===0)");
  const bedtimeHitEnd = platformSource.indexOf("if(left<=0&&!kids.every", bedtimeHitStart);
  const bedtimeHit = platformSource.slice(bedtimeHitStart, bedtimeHitEnd);
  if (!bedtimeHit.includes("const sleeping=kids.filter(k=>k.asleep)") || bedtimeHit.includes("carry=-1")) {
    throw new Error("A bedtime hazard still drops the child Aaron is carrying instead of waking another child");
  }
  console.log("PASS regressions · number entry, paused level hazards, removed office memory, and bedtime wakeups");
  const playablePlatform = await transform(platformSource, { loader: "ts", format: "esm", target: "es2022" });
  const { movePlayer, canFinishInvisibleLoad, careWindowExpired, choreCanBeUndone, energyMovementMultiplier } = await import(`data:text/javascript;base64,${Buffer.from(playablePlatform.code).toString("base64")}`);
  if (!canFinishInvisibleLoad(8,3,false,false) || canFinishInvisibleLoad(8,3,true,false) || canFinishInvisibleLoad(8,3,false,true) || careWindowExpired(9,10,false) || !careWindowExpired(10,10,false) || careWindowExpired(30,10,true) || !choreCanBeUndone(2) || choreCanBeUndone(3)) {
    throw new Error("Invisible Load completion, urgent-care deadline, or three-undo protection logic is incorrect");
  }
  console.log("PASS Invisible Load rules · urgent care is sequential, picked-up needs stop their clock, checklist completion wins immediately, and chores are safe after three undos");
  const makePlayer = (x, y, floor) => ({ x, y, vx: 0, vy: 0, floor, grounded: true, climbing: false, face: 1, walk: 0, hurt: 0, duck: false });
  const hold = (player, keys, frames, jump = false) => { for (let i = 0; i < frames; i++) movePlayer(player, keys, 1 / 60, 1680, jump && i === 0); };
  const climber = makePlayer(100, 443, 0);
  hold(climber, new Set(["w"]), 45);
  if (climber.floor !== 1 || Math.abs(climber.y - 328) > 1 || climber.climbing) throw new Error("Ladder ascent did not land on the next scaffold tier");
  climber.x = 561;
  hold(climber, new Set(["arrowup"]), 45);
  if (climber.floor !== 2 || Math.abs(climber.y - 213) > 1) throw new Error("Second ladder ascent failed");
  climber.x = 941;
  hold(climber, new Set(["w"]), 45);
  if (climber.floor !== 3 || Math.abs(climber.y - 98) > 1) throw new Error("Top ladder ascent failed");
  hold(climber, new Set(["arrowdown"]), 45);
  if (climber.floor !== 2 || Math.abs(climber.y - 213) > 1) throw new Error("Ladder descent failed");
  const jumper = makePlayer(300, 443, 0);
  hold(jumper, new Set(), 100, true);
  if (jumper.floor !== 0 || jumper.y < 380) throw new Error("Jumping bypassed the ladders and reached an upper tier");
  console.log("PASS scaffold movement · ladder ascent, descent, floor-by-floor access, and jump limits");
  if (source.includes("takeCourseHit") || source.includes("enemyTouch(raw:") || source.includes("course-spikes") || source.includes("this.hazards") || source.includes("this.physics.add.overlap(this.player, this.enemies")) {
    throw new Error("The main map still contains damaging hazards or enemy contact");
  }
  if (!source.includes("if (this.player.y > 850)") || !source.includes('toast("Back on the path.")')) {
    throw new Error("Falling from a main map should recover without damage");
  }
  if (!source.includes("const safeX = 2230, safeY = 690;") || !source.includes("body.reset(safeX, safeY)") || !source.includes("this.cameras.main.centerOn(safeX, safeY)")) {
    throw new Error("Leaving the Level 4 day challenge must return Aaron to a clear, saved route near the next story marker");
  }
  if (!platformSource.includes("const dayLength=300") || !platformSource.includes('id="load-time">05:00') || !platformSource.includes("careSequence<repeatedCareGoal*2") || !platformSource.includes("careDeadline=elapsed+10") || !platformSource.includes('id="load-urgent"') || !platformSource.includes('className="load-accident-notice"') || !platformSource.includes("graceUsed=true;left=90;")) {
    throw new Error("The Invisible Load needs a five-minute timer, sequential urgent care, an accident recovery popup, and a fair overtime window");
  }
  if (!platformSource.includes("choreCanBeUndone(task.undoCount)") || !platformSource.includes("task.undoCount++") || !platformSource.includes("underWatch") || !platformSource.includes("choresDone(),playsDone(),!!activeCare,accidentActive")) {
    throw new Error("The kids’ chore interruptions, safe-after-three rule, and immediate checklist win are missing");
  }
  console.log("PASS Level 4 return anchor and timed family-day challenge · clear route, urgent rotating care, finite task undo, accident recovery, overtime grace");
  if (energyMovementMultiplier(100)!==1 || energyMovementMultiplier(50)!==1 || !(energyMovementMultiplier(49)<1) || energyMovementMultiplier(0)!==.4 || !platformSource.includes("if(energy<=0){msg=\"OUT OF ENERGY") || !platformSource.includes("Coffee is always available") || platformSource.includes("stop.used") || !platformSource.includes('classList.toggle("load-potty-emergency",activeCare==="potty"&&!done)') || source.includes('["side-alternator"') || source.includes('["side-fan"')) {
    throw new Error("The Invisible Load needs below-50% fatigue, an energy-zero coffee gate, unlimited coffee, a Matthew emergency flash, and no removed Level 5 memories");
  }
  console.log("PASS requested Invisible Load and Level 5 tweaks · five-minute base timer, speed decreases only below 50%, zero-energy coffee gate, unlimited refills, red potty alert, removed alternator and fan markers");
  if (!platformSource.includes("left=Math.max(0,left-30)") || !platformSource.includes("p.hurt=1.15") || !platformSource.includes("HIT! −30 SECONDS") || !platformSource.includes("−30 SECONDS", platformSource.indexOf("drawAaron(ctx,app.hero,p,cam,time,carry>=0")) || !platformSource.includes("const carryX=x+(p.face>0?47:11)")) {
    throw new Error("Toy hits need visible −30 second feedback, blinking, and a facing-aware carry pose");
  }
  console.log("PASS damage rules · hazards stay in minigames; toy hits blink, show −30 seconds, and keep carried toys in front");
  const gameSource = `${source}\n${platformSource}`;
  const constructorStart = source.indexOf("constructor() {");
  const preloadStart = source.indexOf("preload() {", constructorStart);
  if (constructorStart < 0 || preloadStart < 0 || source.slice(constructorStart, preloadStart).includes("this.physics")) {
    throw new Error("Physics plugins must not be accessed from the scene constructor");
  }
  for (const required of [
    'this.load.image("hero-portrait"',
    'this.load.image("realm-4"',
    "this.physics.add.group({",
    "function startCarromGame(scene: KingdomScene",
    "const computerShot = () =>",
    'unlock("replay-carrom")',
    "function weddingSearch(scene: KingdomScene, marker: Marker)",
    "function aisleRun(scene: KingdomScene, marker: Marker)",
    "function toyboxCleanup(scene: KingdomScene, marker: Marker)",
    "left=270",
    'id="toy-time">04:30',
    "TOYS ${count} / 15",
    "15 TOYS · 4 LEVELS · GREEN CHEST BELOW",
    "TOY CHEST",
    "familyDialogueScene(",
    "Naomi · preschooler",
    "Matthew · toddler",
    "Maliyah · toddler",
    "const storageKey = \"our-kingdom-save-v3\";",
    "scene.vowsUnlocked=true;",
    "Continue to the ceremony",
    "raiven-wedding-dialogue.png",
    "LUNGING! JUMP OR SWAT",
    "family-with-everyone.jpg",
    "autoplay=1&mute=0&playsinline=1&controls=1",
    'wireYouTubeSound("good-thing-sound", "good-thing-player", "CdgihABLoGQ"',
    "function familyPackGame(scene: KingdomScene, marker: Marker)",
    "function seasonPathGame(scene: KingdomScene, marker: Marker)",
    'role="grid" aria-label="Four by four seasonal logic puzzle"',
    "const clues: Record<number, Season>",
    'this.add.container(x, y, [',
    "function midnightRun(scene: KingdomScene, marker: Marker)",
    "numberGame(m: Marker",
    "f.shot=1.45+Math.random()*.45",
    "Where did those vows go?",
    "SELF DOUBT",
    "COLD FEET",
    "THE DIAPER BAG",
    "setModalOpen(true)",
    'body.setAccelerationX(dx * (ducking ? 1150 : 2350))',
    'this.player.anims.play("aaron-walk", true)',
    'this.physics.add.collider(this.player, this.platforms)',
    'The red queen needs a cover',
    'I took the test twice. I think we’re going to have a baby.',
    'm.id === "pregnancy"',
    'm.id === "winter-memory"',
    'coupleScene(',
    'memoryScene(',
    'family-timeline',
    'embed/CdgihABLoGQ',
    'embed/YS8ba414eOg',
    'The original wedding-vow document is recovered after Aaron reaches the arch.',
    "this.sideMemory(m);",
    '"Promise Guard"',
    "ceremonySequence(this)",
    "epilogue(this)",
    '"Read the anniversary letter"',
    'wireYouTubeSound("good-thing-sound", "good-thing-player", "CdgihABLoGQ"',
    'wireYouTubeSound("spend-life-sound", "spend-life-player", "YS8ba414eOg"',
    'restoreSequence(["sandwich", "conversation", "second-date", "breakup-boss"])',
    'restoreSequence(["callback", "echo", "guard", "choice"])',
    'requestFullscreen()',
    'showGameOver(message: string)',
    'Retry from checkpoint',
    'world.pause()',
    'isSolved',
    'Is the first digit even?',
    'inputmode="numeric"',
    '"family-timeline": "toybox"',
  ]) {
    if (!gameSource.includes(required)) throw new Error(`Missing game path: ${required}`);
  }
  for (const required of ['id="anniversary-card"', 'id="ready-player"', "Player 1 found Player 2"]) {
    if (!htmlSource.includes(required)) throw new Error(`Missing anniversary card element: ${required}`);
  }
  console.log("PASS opening card · Player 1 / Player 2 art and Ready Player 1 launch control");
  for (const required of [
    "export function toyboxPlatformer",
    "export function midnightPlatformer",
    "export function breakupBossPlatformer",
    "export function invisibleLoadPlatformer",
    "const WALKWAYS: Floor[]",
    "ladderTargetFloor",
    "OUT OF HEARTS",
    "raiven-wedding-dialogue.png",
    "30 seconds off",
    "UNTIL SUNRISE",
    "heartPickups",
    "BOSS · THE FIRST BREAK",
    "BOSS · THE INVISIBLE LOAD",
    "NAOMI’S ROOM",
    "MALIYAH’S ROOM",
    "const toyLanes=",
    "UNTIL SUNRISE",
    "heartPickups",
    "All three kids are already roaming the scaffold",
    "cryContext??=new AudioContext()",
  ]) {
    if (!platformSource.includes(required)) throw new Error(`Missing platform game feature: ${required}`);
  }
  console.log("PASS story path hooks · character, five realms, physics setup, carrom vs computer, replay, separate wedding games, family challenges, vows, and epilogue");
} finally {
  server.kill("SIGTERM");
}
