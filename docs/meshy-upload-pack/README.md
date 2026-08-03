# Meshy Free Upload Pack — כפלול

Use this pack manually in Meshy. Codex cannot upload these files to Meshy from this environment, but the files are prepared for you here:

`docs/meshy-upload-pack/references/`

## Free-only rule

- Use only Meshy's Free plan.
- Do not enter a credit card.
- Do not start a paid trial.
- Do not click Subscribe / Upgrade / Paid plan.
- If Meshy says credits are exhausted, stop.
- Free-plan output may require attribution. Check Meshy's current license terms before commercial release.

## Recommended workflow

1. Open `https://www.meshy.ai/discover?page=landing`.
2. Use `Quick Generate from an Image` or `Image to 3D`.
3. Upload the reference image listed for one character.
4. Paste the matching prompt below.
5. Generate one model first.
6. Download `GLB` if available.
7. Send the downloaded model back into this repo for Blender cleanup and sprite-sheet rendering.

## Character prompts

### Bifly

Reference file:
`references/bifly-character-sheet.jpg`

Prompt:
```text
Create a polished 3D mobile game character model based on the uploaded reference.
The character is Bifly from a Hebrew educational multiplication maze game.
Keep the exact friendly rounded silhouette, bright cyan body, big expressive eyes, playful child-safe arcade style, and recognizable proportions.
Make it a clean stylized 3D character suitable for rigging and animation.
Use simple readable forms, soft bevels, toy-like material, and strong small-screen readability.
Full body, neutral A-pose or relaxed T-pose, centered, no base, no text, no background props, no weapons, no scary details.
Optimize for a mobile game sprite workflow.
```

### Nabatick

Reference file:
`references/nabatick-character-sheet.jpg`

Prompt:
```text
Create a polished 3D mobile game character model based on the uploaded reference.
The character is Nabatick from a Hebrew educational multiplication maze game.
Keep the exact green plant-like identity, sprout/leaf head detail, big friendly eyes, rounded toy-like body, and child-safe arcade personality.
Make it a clean stylized 3D character suitable for rigging and animation.
Use soft bevels, simple readable shapes, mobile-game material, and strong small-screen readability.
Full body, neutral A-pose or relaxed T-pose, centered, no base, no text, no background props, no weapons, no scary details.
Optimize for rendering sprite sheets in four directions.
```

### Dark Enemy

Reference file:
`references/dark-enemy.png`

Prompt:
```text
Create a small stylized 3D enemy character based on the uploaded reference.
It should feel like a recognizable in-game chaser character from a child-friendly mobile maze game.
Keep the dark rounded body, glowing eyes, simple silhouette, and playful spooky-but-safe expression.
Make it suitable for rigging, bobbing, and moving smoothly through a maze.
Use clean toy-like material, readable eyes, soft highlights, no gore, no realistic horror, no sharp weapons, no text.
Full body, centered, mobile game optimized.
```

### Boss Set

Best reference file:
`references/boss-actor-animation-reference.png`

Backup identity references:
`references/stage-1-boss.png`
`references/stage-2-boss.png`
`references/stage-3-boss.png`
`references/stage-4-boss.png`

Prompt:
```text
Create four polished 3D mobile game boss characters based on the uploaded reference sheet.
Each boss must be a real walkable game character, not a flat poster: clear full body, feet, hands, front/side/back readable silhouette, and riggable proportions.
Keep them child-safe, colorful, stylized, and toy-like for an educational multiplication maze game.

Boss 1: lava guardian, orange fire/rock material, friendly challenge, glowing core.
Boss 2: ice guardian, blue crystal material, friendly face, chunky readable body.
Boss 3: ancient temple guardian, stone/gold/leaf material, soft rounded golem shape.
Boss 4: diamond/crystal guardian, purple/blue crystal material, crown-like top, bright readable silhouette.

Use simple mobile-game geometry, soft bevels, no gore, no horror, no weapons, no text, no bases.
Optimize for rigging and rendering four-direction sprite sheets.
```

## Best production path after download

1. Put downloaded `.glb` files under `assets/3d/source/`.
2. Open in Blender.
3. Clean scale/origin/materials.
4. Render sprite sheets:
   - idle
   - walk
   - hit/question
   - victory/defeat if relevant
   - directions: down, right, left, up
5. Replace only the real game sprite rendering after screenshots confirm the models are better than the current sprites.
