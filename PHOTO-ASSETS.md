# Personal photo drop-in guide

The game includes Aaron’s portrait reference, two supplied family photos in the Level 3 family conversations, and the separate recent family photo at the end of the epilogue. Three illustrated character sheets derived from the family references give Naomi baby, toddler, and preschooler appearances, and Matthew and Maliyah baby and toddler appearances. Family dialogue scenes select the matching child and age-stage illustration. A wedding-only illustrated Raiven character matches her high curly puff ponytail and gown, using the wedding photo as a visual reference. The wedding reference itself is not used as the final wedding-couple photo. The vow document remains a placeholder location for a selected photo if you want to add one. Wedding photos supplied so far were visual references for the illustrated ceremony and character designs; they were not copied into `wedding-couple.jpg`. To use a different wedding portrait in the final scene, place the selected photo at `public/assets/photos/wedding/wedding-couple.jpg`; the final scene checks for that file and displays it automatically. Optional photo ideas and their suggested folders are below. Other formats need conversion to JPG or a matching path change in `src/main.ts`.

A Render Static Site is public to anyone with its URL unless you add access control. The family photo and editable story JSON are bundled assets, so use private hosting if you do not want them publicly reachable.

## Wedding day — `public/assets/photos/wedding/`

- `wedding-couple.jpg` — a clear photo of Raiven and Aaron together; shown after the vow document in the ending. Not included in the files I received.
- `wedding-arch.jpg` — the wooden ceremony arch, flowers, and outdoor setting; optional.
- `wedding-reception.jpg` — reception tent, string lights, or table details; optional.

## Family — `public/assets/photos/family/`

- `family-recent.jpg` — supplied family portrait; shown last in the final sequence.
- `family-with-everyone.jpg` — supplied boardwalk family photo; shown in the Level 3 scrapbook.
- `family-with-mom.jpg` — supplied Raiven-with-kids photo; shown in the Level 3 scrapbook.
- `family-at-home.jpg` — another warm family-at-home image for a Level 3 memory; optional.
- `aaron-with-kids.jpg` — another candid Aaron-with-kids photo; optional.

## Relationship memories — `public/assets/photos/memories/`

- `first-date.jpg` — Heritage Park / first-date memory, if available.
- `carrom-board.jpg` — the homemade carrom board from the first date.
- `proposal.jpg` — backyard Easter proposal / family-photo moment.
- `honeymoon.jpg` — Bolongo Bay / Virgin Islands memory.
- `home-before-after.jpg` — family home or renovation image; optional.

Suggested image sizes: 1600 px or wider for landscape photos; 1200 px or wider for portrait photos. Keep the originals elsewhere. Personal photographs are never fabricated; the five fantasy realm backgrounds and Aaron-inspired character sprite are game illustrations.
