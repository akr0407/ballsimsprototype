# BallSimulator / BouncyLab Studio

Browser-based ball simulation with 22 selectable game modes, including six clearly marked draft modes.

## Project structure

- `config.js` defines shared catalogs and `GAME_MODES` metadata, including the common arena and physics preset for each mode.
- `engine.js` owns simulation state, initialization, physics, collisions, and mode-specific rules.
- `renderer.js` owns drawing, mode selection, UI synchronization, and browser-side preset storage.
- `audio.js` owns sound playback and audio settings.
- `index.html` defines the controls and layout.

## Mode settings

Global visual/audio preferences stay on `simConfig` and `sound`. Arena geometry, physics presets, hooks, and exclusive controls live in `MODE_SETTING_DEFAULTS`; every mode keeps its own values in `simConfig.modeSettings`. The active mode values are projected onto `simConfig` for the existing engine and renderer code. Switching modes saves the active values before loading the other mode. Preset loading accepts the previous version and migrates its flattened settings into the active mode.

The six reference-inspired draft modes (Lines, Paint, Target, Grow, Shatter, and Portal) have their own IDs, presets, and settings buckets. They temporarily reuse the closest existing mechanics so each can be developed separately. Color Match is not included yet because it has no comparable mechanic in the current project.

When adding a mode, add its metadata and preset to `GAME_MODES`, register its initial state in `MODE_INITIALIZERS`, and add its setting defaults to `MODE_EXCLUSIVE_DEFAULTS` when needed. Add only the runtime hooks it needs to `MODE_BEHAVIORS`. Register unique arena drawings in `MODE_ARENA_RENDERERS` and optional visual layers in `MODE_ARENA_OVERLAYS`; ordinary concentric rings use the shared renderer. If the mode needs controls, add its group in `index.html` and add each slider to `MODE_CONTROL_DEFINITIONS` so UI sync, value labels, config updates, and reset behavior stay aligned. Keep shared collision and physics behavior in reusable helpers where the modes agree.

`MODE_INITIALIZERS` owns each mode's initial objects and spawn arrangement. Runtime exceptions such as custom per-ball physics, spike hits, ball contact and impact, bounce effects, escape behavior, or collision participation are registered in `MODE_BEHAVIORS`. Modes without a hook use the shared physics path and default escape behavior. This keeps the common simulation loop readable while allowing substantially different modes to opt into their own rules.

The mode reset button restores both the common preset and that mode's exclusive defaults. Switching modes remembers the current mode's exclusive values.

## Presets

The Save / Load Presets controls store named configuration snapshots in browser `localStorage`, including the active mode, mode-specific settings, shared simulation settings, and sound settings. Presets are local to the current browser profile. Uploaded image and audio files are not embedded in a preset; reselect those files after loading if needed.

## Recording and music

The preview and WebM export support Portrait (1080×1920) and Landscape (1920×1080). Orientation is a global setting and is included in saved presets.

The canvas can be recorded to WebM at 1080×1920 for a chosen duration. Preview speed is adjustable from 1× to 8×; recording forces 1× and restores the preview speed afterward. Find Simulation searches deterministic seeds for a run whose first completion is close to the selected target duration.

Global visual layers can be combined: ball glow, wall glow, color trails, trail thickness, and confetti, shatter, and shockwave particles each have independent controls. These particle switches affect the corresponding effects wherever a mode emits them. Older presets with the single effects switch migrate that value to all three layers.

The Melody Studio can select built-in note sequences, edit a sequence using note names such as `C4 E4 G4`, or import a Standard MIDI file. MIDI import extracts note-on events and maps their pitch order to simulation-triggered notes; MIDI tempo, note lengths, and track timing are not currently played back as a timed soundtrack.
