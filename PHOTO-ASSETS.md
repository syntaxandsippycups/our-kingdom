# Personal photo drop-in guide

This guide lists the exact filenames the game looks for. Aaron’s portrait, the family photos, and illustrated character art are already included. Add any missing personal photos at the paths below; the game checks for them and shows a friendly placeholder where a required photo has not been added yet. Other formats need conversion to JPG or a matching path change in `src/main.ts`.

A Render Static Site is public to anyone with its URL unless you add access control. The family photo and editable story JSON are bundled assets, so use private hosting if you do not want them publicly reachable.

## Wedding day — `public/assets/photos/wedding/`

- `wedding-couple.jpg` — a clear photo of Raiven and Aaron together; shown in a larger square frame near the end.
- `wedding-arch.jpg` — the wooden ceremony arch, flowers, and outdoor setting; optional.
- `wedding-reception.jpg` — shown after Aaron finishes arranging the ceremony colors; reception tent, string lights, or table details work well.
- `wedding-01.jpg` through `wedding-10.jpg` — up to ten wedding photos in the slideshow after “Good Thing.” Add as many numbered images as you like; missing numbers are skipped.

## Family — `public/assets/photos/family/`

- `family-recent.jpg` — supplied family portrait; shown last in the final sequence.
- `family-with-everyone.jpg` — supplied boardwalk family photo; shown in the Level 3 scrapbook.
- `family-with-mom.jpg` — supplied Raiven-with-kids photo; shown in the Level 3 scrapbook.
- `family-at-home.jpg` — another warm family-at-home image for a Level 3 memory; optional.
- `aaron-with-kids.jpg` — another candid Aaron-with-kids photo; optional.

## Relationship memories — `public/assets/photos/memories/`

- `first-date.jpg` — appears in the Jersey Mike’s first-meeting dialogue scene.
- `carrom-board.jpg` — the homemade carrom board from the first date.
- `proposal.jpg` — appears in the backyard Easter proposal dialogue.
- `honeymoon.jpg` — appears as the final frame of the wedding-photo slideshow.
- `home-before-after.jpg` — family home or renovation image; optional.

Suggested image sizes: 1600 px or wider for landscape photos; 1200 px or wider for portrait photos. Keep the originals elsewhere. Personal photographs are never fabricated; the five fantasy realm backgrounds and Aaron-inspired character sprite are game illustrations.
