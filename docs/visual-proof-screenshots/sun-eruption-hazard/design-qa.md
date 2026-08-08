# Sun Eruption Hazard — Design QA

## Comparison input

- Source: `before/user-reported-world1-hazard.jpeg`
- Implementation: `after/mobile-active-390x844.png`
- Combined comparison: `before-after-danger-comparison.png`
- Target viewport: mobile portrait, 390×844

## Visual verdict

The implementation is unmistakably different from the reported state. The old soft yellow cells read like rewards or floor buttons. The new hazard reads as danger before interaction because it uses a scorched black silhouette, saturated red/orange heat, sharp stone teeth, a white-hot core, a rotating warning ring, eruption rays, flame tongues, embers, and a connected burned channel.

## Functional and motion verdict

- Active hazard: PASS — animated size pulse, rotating segmented ring, eruption rays, flames, embers, and moving channel sparks.
- Telegraph state: PASS — contracting red/yellow warning ring and exclamation cue before activation.
- Collision feedback: PASS — character shrinks and chars, flame burst appears, smoke rises, heart loss commits before respawn.
- Reduced-effects mode: PASS — fewer flames and embers, but the raster trap, scorch, red ring, and burn sequence remain semantically clear.
- Mobile readability: PASS — hazard is visible at the 390×844 gameplay camera without hiding the maze route.
- Desktop readability: PASS — the group remains distinct against the Sun Garden floor at 1280×800.

## Severity review

- P0 blockers: none.
- P1 visual/functional issues: none.
- P2 polish issues: none observed in the captured active and impact states.

## Evidence

- `after/mobile-active-390x844.png`
- `after/desktop-active-1280x800.png`
- `after/mobile-impact-shrink-flame-390x844.png`
- `after/mobile-impact-smoke-heart-loss-390x844.png`
- `after/impact-sequence-contact-sheet.png`
- `after/sun-eruption-hazard-mobile-full.mp4`
- `after/sun-eruption-hazard-mobile-focus.mp4`
- `after/sun-eruption-impact-sequence.mp4`
