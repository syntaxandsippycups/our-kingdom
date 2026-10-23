# Our Kingdom: Five Years, One Heart

A personal, browser-playable 2D fantasy action-adventure for Raiven and Aaron’s fifth wedding anniversary, paced as a 25–40 minute trip through five years together. It uses Phaser 3, TypeScript, and Vite and runs as a static site without a backend.

The full story bible informs five connected realms: Heritage Park and the first date; the fall wedding and recovered vows; family life and fatherhood; a four-season journey through change and hope; and a final adventure that returns to the family home. The realms use a side-scrolling world map, with separate arcade scenes for the platform challenges and dialogue scenes where Aaron and Raiven appear together. Optional memories carry details from the proposal, the Upward reconnection, the honeymoon, family routines, trips, music, and affectionate household jokes. The ending uses the complete supplied anniversary declaration and leaves the relationship’s ongoing work acknowledged.

## Play locally

1. Install Node.js 20.19+.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local URL Vite prints.
4. The anniversary card opens first. Click **Ready Player 1** to begin the adventure.
5. Follow the `NEXT` objective in the top bar and look for the matching illustrated keepsake. Press `E` beside it. Optional side keepsakes open short character scenes.
6. Click **Full Screen** in the top bar to expand the game to the whole display.

## Controls

- **A / D or ← / →** — walk the side-scrolling path
- **Space / W / ↑** — jump (hold briefly for a higher jump)
- **E** — interact with a nearby character, clue, or object
- **J / left mouse button** — attack with a short-range forward swat
- **Shift** — dodge through telegraphed danger
- **S / ↓** — duck during the platform challenges; use **↑ / ↓** while standing at a ladder to climb between floors
- **Q** — use the selected ability
- **1 / 2 / 3 / 4** — select Memory Echo / Promise Guard / Together / Steadfast
- **Tab** — open Memory Journal
- **Esc** — pause, resume, open the journal, or toggle ambience

Progress and achievements save in browser local storage. Continue returns to the beginning of the last realm entered. The game can be paused at any point; pausing during play unlocks **DAD DUTY — GAME PAUSED SUCCESSFULLY**.

## Levels and progression

1. **The Beginning** — meet outside Jersey Mike’s in a two-character scene, choose Aaron’s first words, and later choose what he asks during their long talk about faith and the future. The carrom table is a full match against a computer player with baseline striker placement, disc collisions, pocketing, queen-cover rules, and a replay option. After the second date, a four-level breakup boss sends Aaron up a scaffold to face animated doubt, bad timing, and unsaid words before he reaches an illustrated Raiven in the wedding dress. Use the ladders to climb between floors; jumping cannot replace them. A hit drains a heart without moving Aaron to a checkpoint. Empty hearts pause the boss and offer **Retry** or **Quit**. The dialogue is imagined; the historical memory remains that Raiven won both carrom games on the date.
2. **The Promise** — leave the wedding path for a full-screen hidden-object hunt, find five wedding-day keepsakes (including Raiven’s missing vows), then play the aisle guardian platformer to reach the wooden arch. Enemies have distinct silhouettes, telegraphed lunges, and a visible swat; Aaron can jump, dodge, and lose health. Only after he wins does the complete vow document unlock. Selected original excerpts and a short ceremony scene lead into “Good Thing.” The music player has a **Play with sound** button because browsers may block audio autoplay. Optional memories include the cold ceremony, blue suits, proposal, and honeymoon.
3. **The Beautiful Chaos** — share the first pregnancy announcement, pack an outing bag, then play a four-level scaffold living-room cleanup with 20 toys, a visible five-minute timer, a green toy chest on the bottom floor, and steady phone/TV hazards. A hit costs 20 seconds and drops the carried toy back at its starting spot; jumping and ducking avoid hazards. The child dialogue follows their growth in chronological order, from baby days through toddler and preschool years, using the supplied family photo references and character sheets. The Midnight Marathon is a separate scaffold house: different bedrooms sit on different levels; noises can wake Naomi or Matthew, who must be carried back to bed, then Aaron settles baby Maliyah before Raiven wakes. A quiet morning scene completes the realm.
4. **Through Every Season** — solve a 4×4 seasonal Latin-square puzzle with five fixed clues, row and column constraints, candidate notes, collision feedback, and limited logic hints. Share a home memory, then face **The Invisible Load**: a scaffolded day of meals, an outing, dishes, laundry, homework, and bedtime, with a finite energy meter and two coffee stops. The conversation afterward acknowledges that a coffee break does not solve an uneven workload. The realm holds grace alongside honesty, accountability, and rebuilding trust.
5. **The Next Adventure** — revisit the same vow document, recover the Heartlight trace, ready Promise Guard, fight the two-phase Unwritten, and make the Choice that opens the anniversary letter. The game shows a clear **Read the anniversary letter** action; the ending then shows the vows, wedding photograph, recent family photograph, and final anniversary message.

The main playable challenges open as their own scenes, with a clear return to the realm after completion or when leaving. The campaign is designed to take 25–40 minutes for a full adult playthrough, including the wedding search, aisle fight, 20-toy scaffold challenge, night shift, seasonal logic puzzle, invisible-load boss, final encounter, and selected dialogue scenes. Optional memories and exploration extend the visit. The range remains a design target; it has not been measured in a full browser playtest.

## Photos and story customization

- `public/story-data/story.json` — authoritative supplied vows, ceremony excerpts, complete anniversary declaration, optional memory summaries, family details, and the Level 5 callback.
- `public/assets/characters/aaron.png` — original illustrated hero portrait inspired by the supplied family reference photo.
- `public/assets/characters/aaron-walk-sheet.png` — the animated walking sprite sheet used during side-scrolling gameplay.
- `public/assets/characters/raiven-wedding-dialogue.png` — wedding-only illustrated portrait with the high curly puff ponytail and gown from the supplied wedding reference; the source photo is not used as the ending photo.
- `public/assets/characters/aaron-walk-sheet.png` — eight-frame side-view walk cycle used by the playable character.
- `public/assets/characters/raiven-dialogue.png` — illustrated Raiven character used in the first-meeting scene.
- `public/assets/characters/children-naomi-growth.png` — three illustrated Naomi age stages: baby, toddler, and preschooler.
- `public/assets/characters/children-matthew-growth.png` — three illustrated Matthew age stages, based on the family reference photos.
- `public/assets/characters/children-maliyah-growth.png` — three illustrated Maliyah age stages, based on the family reference photos.
- `public/assets/scenes/wedding-vows.png` — newly illustrated ceremony scene based on the supplied wedding references.
- `public/assets/scenes/pregnancy-reveal.png` — newly illustrated fictional pregnancy-reveal scene.
- `public/assets/scenes/family-moment.png` — newly illustrated family scene based on the supplied family reference.
- `public/assets/photos/family/family-recent.jpg` — the supplied family photograph used in the epilogue.
- `public/assets/photos/family/family-with-everyone.jpg` and `family-with-mom.jpg` — supplied photos shown in the Level 3 family scrapbook.
- `PHOTO-ASSETS.md` — list of optional wedding and memory photographs and their filenames.

The full vows stay scrollable and reopen from the Memory Journal once recovered. Supplied historical quotations are identified separately from fictional game dialogue and faithful story summaries. The carrom mini-game has a separate rematch button and an in-world replay marker after the first match. Challenges use direct controls, visible objectives, and clear feedback. The requested songs play through YouTube-hosted players; their commercial recordings are not bundled into the game. A sound button explicitly unmutes and starts each song if the browser blocks autoplay.

## Render Static Site deployment

Create a **Static Site** from this project or its Git repository.

- **Build command:** `npm install && npm run build`
- **Publish directory:** `dist`
- **Environment:** Node 20.19 or newer

No environment variables or backend are required. A static Render URL makes the bundled family photo and story data reachable to anyone with the URL; use private hosting or access controls for a private gift.

## Included game assets

- Five illustrated realm backgrounds and new wedding and family story-scene artwork.
- Aaron’s walk-cycle, character portraits, and original fantasy encounter sprite.
- Supplied family photo in the final photo sequence.
- Original ambient loop; no copyrighted commercial recordings or game artwork.

## Testing

- `npm run build` — strict TypeScript validation and production build.
- `npm test` — starts the compiled Vite preview and checks the production HTML, source data, art, photo, and audio endpoints.

A full browser playthrough was not available in this environment. The build and production endpoint checks are automated; before presenting it to Aaron, start the dev server, click **Begin the adventure**, and confirm keyboard controls in the browser you will use.
