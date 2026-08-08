# Design QA — character nameplates

## Grounding

- Product screenshot: `docs/visual-proof-screenshots/character-brand-tutorial-smooth/mobile-home-after-390x844.png`
- Official brand mark: `assets/kaflul-logo-official.png`
- Research pattern applied: character art remains dominant; names use compact, high-contrast identity plates with a restrained selected state.

## Visible checks

- The former oversized gradient text, purple extrusion, and competing glow were removed.
- Both Hebrew names use a solid Rubik 900 face on a dark, high-contrast nameplate.
- Bifly keeps a cyan accent and Nabatik keeps a lime accent without tinting the name text itself.
- The checked radio state adds a gold border and a localized `נבחר` / `Selected` tag.
- The inactive hero art is subdued while its name remains readable.
- Hebrew and English labels were verified after a real language switch.
- Selected and unselected character states were verified through the actual radio controls.

## Viewport QA

- Mobile portrait: 390×844, no horizontal or vertical overflow.
- Desktop: 1280×800, no horizontal overflow.
- Console: no errors or warnings on the verified home screen.
- The nameplates remained fully visible and were not clipped at either viewport.

## Visual proof

- Combined before/after: `docs/visual-proof-screenshots/character-nameplates/before-after-mobile-390x844.png`
- Mobile, Nabatik selected: `docs/visual-proof-screenshots/character-nameplates/mobile-home-nabatik-selected-after-390x844.png`
- Mobile, Bifly selected: `docs/visual-proof-screenshots/character-nameplates/mobile-home-bifly-selected-390x844.png`
- Desktop Hebrew: `docs/visual-proof-screenshots/character-nameplates/desktop-home-after-1280x800.png`
- Desktop English: `docs/visual-proof-screenshots/character-nameplates/desktop-home-english-after-1280x800.png`

The new result is unmistakably different from the old treatment: the names now read as professional UI labels instead of a second decorative logo.

## Verification

- `pnpm run build` with the bundled Node runtime: passed.
- `git diff --check`: passed.
- Manual browser checks at both required viewports: passed.

final result: passed

---

# Design QA — desktop Bifly and Nabatick separation

## Source and rendered evidence

- Source visual truth: `/Users/eliran/Desktop/צילום מסך 2026-08-07 ב-16.53.59.png` (3024×1964 physical pixels, full Codex and browser screenshot). The relevant browser content region is approximately 1152×970 CSS pixels.
- Reproduced before state: `docs/visual-proof-screenshots/landing-nabatick-overlap/before-desktop-1152x970.png` (1152×970 CSS/output pixels, device scale factor 1).
- Post-fix same-state capture: `docs/visual-proof-screenshots/landing-nabatick-overlap/after-pass1-desktop-1152x970.png` (1152×970 CSS/output pixels, device scale factor 1).
- Wide desktop check: `docs/visual-proof-screenshots/landing-nabatick-overlap/after-desktop-1440x960.png` (1440×960 CSS/output pixels, device scale factor 1).
- Mobile regression check: `docs/visual-proof-screenshots/landing-nabatick-overlap/after-mobile-390x844.png` (390×844 CSS/output pixels, device scale factor 1).

The supplied screenshot and same-width rendered capture were opened together in one comparison input. The desktop content viewport was matched instead of comparing the unrelated Codex sidebar and operating-system chrome.

## Comparison history and findings

- [P1, fixed] Nabatick was hidden behind Bifly in the desktop hero. At 1152×970 the transformed image rectangles overlapped across 57.3% of Nabatick's bounding area, and Bifly's higher stacking order covered the character's face and body.
- Fix: Bifly was reduced from a 35vw/500px treatment to 29vw/430px, Nabatick was given a 20vw/295px slot beside it, rotations were softened, and Nabatick now has the foreground stacking level.
- Post-fix evidence: overlap fell to 2.31% at both 1152×970 and 1440×960; this remaining rectangle overlap is transparent image margin and no visible part of either character is hidden. Mobile remains at 0% overlap.

## Required fidelity surfaces

- Fonts and typography: unchanged; headline, supporting copy, navigation and CTA wrapping match the approved hero.
- Spacing and layout rhythm: the character group now reads as two side-by-side heroes with balanced negative space and no collision with the copy column.
- Colors and tokens: unchanged; original navy, lime, cyan and gold treatments remain intact.
- Image quality and asset fidelity: the same official Bifly and Nabatick raster assets remain sharp, complete and uncropped; no replacement or redraw was introduced.
- Copy and content: unchanged.

## Verification

- Browser console errors/warnings: none.
- `npm run build:vercel`: passed.
- `npx playwright test tests/landing.spec.js`: 16 passed across desktop and mobile Chromium.
- Automated regression now requires desktop character overlap below 8%; measured result is 2.31%.

No actionable P0, P1 or P2 issues remain. The corrected screenshot is unmistakably different in the reported area: Nabatick is fully visible beside Bifly instead of being covered by it.

final result: passed

---

# Design QA — landing page final

## Grounding

- Approved source: `docs/landing-concepts/option-2-final-flow-leaderboard.png`
- Production assets: official Kaflul logo, Bifly, Nabatick, ghosts, champion trophy, real gameplay screenshots and world screenshots.
- Generated environment asset: `assets/landing/hero-maze-chase-v2.png`; character identity was not generated or approximated.

## Visual comparison

- The implementation keeps the approved split composition: maze chase artwork on the left, high-contrast RTL conversion copy on the right, a single gold primary action, and the real-game explanation directly below the fold.
- The final source and implementation screenshots were opened together in one comparison input.
- The flow copy was corrected to the real product behavior: choose character/mode/difficulty; touching an enemy opens a multiplication exercise; answers, items, missions and bosses add score; the highest score enters Champions.
- The #1 challenge is represented twice without fake player names or fabricated scores: in the first explanation section and in the full Champions section.
- P0 issues: none.
- P1 issues: none.
- P2 issues found and fixed: mobile horizontal overflow, distorted character aspect ratios, insufficiently visible real character pairing, small footer link targets, and a share action with no immediate live status.

## Accessibility QA

- Hebrew RTL document language and direction are explicit.
- One H1 and semantic header, navigation, main, sections, aside and footer are present.
- Skip link, keyboard navigation, Escape-to-close with focus restoration, visible focus styling, native FAQ disclosure controls and live status messages are implemented.
- Visible interactive targets measured at 44×44 CSS pixels or larger on 390×844.
- Key text/background contrast pairs measure from 9.70:1 to 18.14:1.
- Reduced-motion, increased-contrast and forced-colors adaptations are included.
- The accessibility statement names Israeli Standard 5568 and WCAG 2.2 AA as the implementation target, lists the accommodations, supplies a reporting channel and records the update date.

## Viewport and interaction QA

- Desktop: 1440×960, no horizontal overflow, no broken images.
- Mobile portrait: 390×844, no horizontal overflow, no broken images.
- Mobile menu: opens, closes with Escape and restores focus to the menu button.
- Share: invokes native sharing where available and exposes immediate status in an `aria-live` region; clipboard fallback remains implemented.
- Android APK: local server returned HTTP 200 for `dist/kaflul-updated-20260729.apk`.
- Browser console: no errors or warnings during the verified interactions.

## Visual proof

- Prior landing hero: `docs/visual-proof-screenshots/landing-summer/after-summer-hero-desktop-1440x960.png`
- Desktop hero: `docs/visual-proof-screenshots/landing-final/after-hero-desktop-1440x960.png`
- Desktop real flow: `docs/visual-proof-screenshots/landing-final/after-how-desktop-1440x960.png`
- Desktop Champions: `docs/visual-proof-screenshots/landing-final/after-champions-desktop-1440x960.png`
- Desktop accessibility statement: `docs/visual-proof-screenshots/landing-final/after-accessibility-desktop-1440x960.png`
- Mobile hero: `docs/visual-proof-screenshots/landing-final/after-hero-mobile-390x844.png`
- Mobile real flow: `docs/visual-proof-screenshots/landing-final/after-how-mobile-390x844.png`

## Verification

- `pnpm run build:vercel`: passed.
- `pnpm run test:node`: 58 passed, 0 failed.
- `node --check landing.js`: passed.
- `git diff --check` for the landing implementation: passed.

The visible result is unmistakably different from the prior landing page and closely follows the approved option 2 while using the exact production character assets.

final result: passed

---

# Design QA — landing store controls

## Visible changes

- The complete three-step row and its secondary leaderboard challenge were removed from the page.
- The hero now continues directly into the real gameplay screenshots.
- The Android APK remains a direct download and is now presented with a recognizable Google Play mark.
- A disabled App Store control with an Apple store mark and a visible `בקרוב` label was added beside it.
- The same store controls are repeated in the final download card for a consistent call to action.

## Accessibility and responsive QA

- Both store groups have an accessible Hebrew label.
- Android downloads are descriptive links; App Store controls use native disabled buttons with explicit accessible names.
- Decorative store marks use empty alternative text so the control label is not announced twice.
- Desktop 1440×960 and mobile portrait 390×844 have no horizontal overflow.
- Store controls measure 66 CSS pixels high; all interactive controls remain at least 44×44 CSS pixels on mobile.
- Keyboard focus, reduced motion, RTL semantics, menu focus restoration and image loading were rechecked by the landing-page suite.

## Visual proof

- Desktop hero: `docs/visual-proof-screenshots/landing-store-buttons/after-desktop-1440x960.png`
- Desktop download card: `docs/visual-proof-screenshots/landing-store-buttons/after-download-desktop-1440x960.png`
- Mobile hero: `docs/visual-proof-screenshots/landing-store-buttons/after-mobile-390x844.png`
- Mobile store controls: `docs/visual-proof-screenshots/landing-store-buttons/after-store-buttons-mobile-390x844.png`

## Verification

- `pnpm run build:vercel`: passed.
- `pnpm run test:node`: 58 passed, 0 failed.
- `playwright test tests/landing.spec.js`: 14 passed across desktop and mobile Chromium.
- `git diff --check`: passed.

The result is visibly different: the former steps row is absent and the Android/App Store choices are now prominent, branded controls.

final result: passed

## Google Play link update — 7 August 2026

- Both Android controls now open the official Google Play listing for `com.kaflul.mathmaze` in a new browser tab.
- The obsolete direct-APK `download` behavior was removed from those controls.
- Visible and accessible labels now identify Google Play explicitly; App Store remains disabled and marked `בקרוב`.
- Desktop proof: `docs/visual-proof-screenshots/landing-google-play-link/desktop-hero-1440x960.png`.
- Mobile proof: `docs/visual-proof-screenshots/landing-google-play-link/mobile-hero-390x844.png`.
- `npm run build:vercel` passed; the landing Playwright suite passed 14/14 tests across desktop and mobile Chromium.

## Yatzir creator credit — 7 August 2026

- Added a restrained final-footer credit reading `האפליקציה מבית היוצר של יציר`.
- Reused the supplied original Yatzir AI Solutions logo, optimized to a 360 px project asset and displayed at 92 px desktop / 82 px mobile.
- The logo is decorative beside an explicit accessible Hebrew credit, avoiding duplicate screen-reader output.
- Desktop proof: `docs/visual-proof-screenshots/landing-yatzir-credit/desktop-footer-1440x960.png`.
- Mobile proof: `docs/visual-proof-screenshots/landing-yatzir-credit/mobile-footer-390x844.png`.
- Mobile verification keeps a 91 px clear gap between the creator credit and the fixed play bar, with no horizontal overflow.

## Landing Bifly framing fix — 7 August 2026

- Confirmed the source character artwork is complete; the defect came from layout positioning in the download card.
- Removed the conflicting physical/logical offsets that stretched and shifted Bifly on narrow RTL layouts.
- Reduced the secondary character scale, centered it inside its art area, and softened the rotation while preserving the approved hero composition.
- Desktop proof: `docs/visual-proof-screenshots/landing-bifly-fix/after-download-desktop-1440x960.png`.
- Mobile proof: `docs/visual-proof-screenshots/landing-bifly-fix/after-download-mobile-390x844.png`.
- The corrected transformed image bounds are fully contained by the download card at both viewports; the landing suite passed 16/16 tests.

---

# Design QA — landing character and stage-gallery cleanup

## Source visual truth

- Cropped mobile hero: `/tmp/codex-remote-attachments/019fc5a1-2cb1-7440-b67b-3c8dc0d8fd18/0ae5f540-4c5a-4191-b2ab-7e9c69644893/1-Photo-1.jpg` (591×1280 physical pixels, including mobile browser chrome).
- Obsolete stage gallery: `/tmp/codex-remote-attachments/019fc5a1-2cb1-7440-b67b-3c8dc0d8fd18/0ae5f540-4c5a-4191-b2ab-7e9c69644893/2-Photo-2.jpg` (591×1280 physical pixels, including mobile browser chrome).
- Bifly download-card reference: `/tmp/codex-remote-attachments/019fc5a1-2cb1-7440-b67b-3c8dc0d8fd18/0ae5f540-4c5a-4191-b2ab-7e9c69644893/3-Photo-3.jpg` (591×1280 physical pixels, including mobile browser chrome).

## Rendered implementation evidence

- Short mobile hero: `docs/visual-proof-screenshots/landing-character-cleanup/after-mobile-short-390x700.png` (390×700 CSS and output pixels, device scale factor 1).
- Mobile portrait hero: `docs/visual-proof-screenshots/landing-character-cleanup/after-mobile-390x844.png` (390×844 CSS and output pixels, device scale factor 1).
- Mobile download Bifly: `docs/visual-proof-screenshots/landing-character-cleanup/after-download-mobile-390x844.png` (390×844 CSS and output pixels, device scale factor 1).
- Desktop hero: `docs/visual-proof-screenshots/landing-character-cleanup/after-desktop-1440x960.png` (1440×960 CSS and output pixels, device scale factor 1).
- Direct hero-to-Champions transition: `docs/visual-proof-screenshots/landing-character-cleanup/after-champions-direct-1440x960.png` (1440×960 CSS and output pixels, device scale factor 1).

The source captures include browser chrome and use a different physical density, so they were normalized at the content-composition level rather than resized for a false pixel-perfect comparison. The supplied hero/download captures and the rendered mobile captures were opened together in one comparison input. Focused comparison was required for the two Bifly placements because asset crop and transparent margins were the reported defects.

## Findings and comparison history

- [P1, fixed] On a 390×700 content viewport the former hero placed the characters below the full conversion copy, leaving only their upper faces above the fixed play bar. The mobile character group is now a dedicated 210 px stage below the header; all four transformed image bounds finish by y=272, while the play bar begins at y=631.
- [P1, fixed] Bifly used the celebration file in both visible placements, with decoration reaching the source edge and layout offsets that made the result look cropped. Both placements now use the clean full-body `bifly-expression-idle.png`, `object-fit: contain`, square bounds and internal safety padding in the download card.
- [P1, fixed] The obsolete gameplay and world screenshot galleries remained in the document. The complete `#gameplay` region, its images, responsive styling and navigation links were removed. `#champions` is now the immediate sibling after `#top`.
- Post-fix evidence: all 16 landing tests pass in desktop and mobile Chromium; the added short-mobile assertion verifies all four hero images are square, inside the hero and at least 8 px clear of the fixed play bar. Download Bifly bounds are fully contained by the download card.

## Required fidelity surfaces

- Fonts and typography: existing Assistant/Fredoka hierarchy, Hebrew RTL wrapping and weights are unchanged and remain readable at 390×700, 390×844 and 1440×960.
- Spacing and layout rhythm: the mobile hero now presents complete character art first, followed by copy; redundant hero actions are suppressed only below 761 px viewport height because the persistent play action already remains available.
- Colors and visual tokens: the established navy, cyan, lime and gold palette is unchanged; the removal creates a clean direct transition into the Champions section.
- Image quality and asset fidelity: official project assets are used without redrawing; Bifly is sharp, square and visibly complete in hero and download contexts. No broken images or horizontal overflow were found.
- Copy and content: obsolete stage/gallery claims and their navigation label are gone; the hero scroll and footer now lead to the real Champions challenge.

## Verification

- Primary interactions: mobile navigation focus restoration, share fallback, Google Play links, disabled App Store controls, keyboard focus and FAQ disclosure all passed.
- Console errors/warnings on the rendered page: none.
- `npm run build`: passed.
- `npm run build:vercel`: passed.
- `npx playwright test tests/landing.spec.js`: 16 passed.
- `git diff --check`: passed.

No actionable P0, P1 or P2 issues remain. The new screenshots are unmistakably different from the supplied references: the characters are complete at first load, Bifly is no longer framed as a crop, and the entire obsolete stage gallery is absent.

final result: passed
