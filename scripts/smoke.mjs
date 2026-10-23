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
  const playablePlatform = await transform(platformSource, { loader: "ts", format: "esm", target: "es2022" });
  const { movePlayer } = await import(`data:text/javascript;base64,${Buffer.from(playablePlatform.code).toString("base64")}`);
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
  const enemyHitStart = source.indexOf("enemyTouch(raw:");
  const spikeHitStart = source.indexOf("takeCourseHit()", enemyHitStart);
  const gameOverStart = source.indexOf("showGameOver(message:", spikeHitStart);
  const enemyHit = source.slice(enemyHitStart, spikeHitStart);
  const spikeHit = source.slice(spikeHitStart, gameOverStart);
  if (enemyHit.includes("setPosition(") || spikeHit.includes("setPosition(")) throw new Error("A combat hit still teleports the player");
  console.log("PASS damage flow · hits do not teleport; zero hearts expose retry and quit");
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
    "left=300",
    "TOYS ${count} / 20",
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
    "autoplay=1&playsinline=1&controls=1",
    "function familyPackGame(scene: KingdomScene, marker: Marker)",
    "function seasonPathGame(scene: KingdomScene, marker: Marker)",
    'role="grid" aria-label="Four by four seasonal logic puzzle"',
    "const clues: Record<number, Season>",
    'this.add.container(x, y, [',
    "function midnightRun(scene: KingdomScene, marker: Marker)",
    "numberGame(m: Marker",
    "Where did those vows go?",
    "SELF DOUBT",
    "COLD FEET",
    "THE DIAPER BAG",
    "modalOpen = true;",
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
    'wireYouTubeSound("good-thing-sound", "good-thing-player")',
    'wireYouTubeSound("spend-life-sound", "spend-life-player")',
    'restoreSequence(["sandwich", "conversation", "second-date", "breakup-boss"])',
    'restoreSequence(["callback", "echo", "guard", "boss", "choice"])',
    'requestFullscreen()',
    'showGameOver(message: string)',
    'Retry this level',
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
    "20 seconds off",
    "BOSS · THE FIRST BREAK",
    "BOSS · THE INVISIBLE LOAD",
    "NAOMI’S ROOM",
    "MALIYAH’S NURSERY",
    "const toyLanes=",
    "20 seconds off",
  ]) {
    if (!platformSource.includes(required)) throw new Error(`Missing platform game feature: ${required}`);
  }
  console.log("PASS story path hooks · character, five realms, physics setup, carrom vs computer, replay, separate wedding games, family challenges, vows, and epilogue");
} finally {
  server.kill("SIGTERM");
}
