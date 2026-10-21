# Project Brief — 2D Bouncing Ball Simulator

## Objective
Create a browser-based, interactive 2D bouncing-ball simulation inspired by the mechanics and configurable visual style shown on BouncyLab and BallSimulator.

## Core concept and loop
Choose a simulation mode, tune its physics and appearance, then watch a live run. Pause or restart and adjust settings to explore a new result.

## Confirmed decisions
- **Target:** Web browser; user confirmed this direction.
- **Development environment:** Antigravity for vibe coding.
- **Recommended implementation:** TypeScript + Vite + HTML Canvas 2D, with custom 2D simulation logic and Web Audio API for sound. Three.js is not needed for the initial 2D prototype.
- **Assets:** Begin with procedural shapes and placeholder colors; replace or extend them after validating the simulation.
- **Reference set:** BouncyLab and BallSimulator websites and user-provided screenshots. YouTube videos are optional and have not been viewed.
- **Initial mode scope (assumed accepted by “lanjutkan”):** Circle Spikes, Duplicate Balls, Eating Balls, and Infinite Walls, inspired by BouncyLab. Keep the mode structure open to later additions.

## First playable prototype
Start with one mode in a browser canvas, with live motion, pause/restart controls, and a small set of useful physics settings. Validate playability and tuning before implementing the remaining modes.

## Non-goals for the first prototype
- 3D gameplay or Three.js rendering.
- Full feature parity with every mode or tool on BallSimulator.
- Final art, imported audio library, MIDI editor, video export, accounts, or monetization.

## Technical constraints and assumptions
- Keep the simulation responsive in a browser and separate mode rules enough to add modes without rewriting the rendering/UI.
- Use simple procedural visuals first.
- Exact source code, assets, and proprietary implementation details from the reference sites are not available; the goal is to reproduce the broad experience and mechanics with original implementation.
- Engine/library versions, browser support targets, and performance limits are not yet fixed; choose current stable project dependencies when implementation begins.

## Definition of Done — first playable
- Opens and runs in a browser through the project’s local development workflow.
- The first selected mode has a complete, repeatable core loop.
- Pause and restart work reliably.
- At least a few physics settings affect the live simulation as expected.
- No obvious simulation escape/sticking bugs in a manual play session.

## Unresolved
- Which mode should be implemented first? Recommended: **Circle Spikes**, because it demonstrates bouncing, rotating geometry, collision response, and escape conditions.
- Exact screen orientation/aspect ratio for eventual video capture.
- Whether sound should be included in the first prototype or added after physics validation.

## Progress record
- Confirmed by user: browser target and Antigravity workflow.
- Proposed and accepted by continuation: begin with four BouncyLab-inspired modes and placeholders.
- Implemented: nothing yet.
