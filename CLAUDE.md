# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**stream.** is a single-file PWA for school productivity. The entire app lives in one `index.html` (~6 000 lines) with all CSS and JavaScript inline — no build step, no framework, no bundler, no npm. Open `index.html` directly in a browser, or serve with any static file server (e.g. `npx serve .` or VS Code Live Server).

Supporting files:
- `sw.js` — service worker for offline/PWA support
- `manifest.json` — PWA manifest

## Architecture

### Single-file structure
All CSS is in a `<style>` block at the top of `index.html`. All JavaScript is in `<script>` blocks at the bottom. Sections are delimited by banner comments like `/* ════ SECTION NAME ═══ */`.

### Pages and routing
Pages are `<div id="pg-{name}" class="pg">` elements inside `#page-stack`. Navigation is handled by `goTo(pg, el)` which adds/removes the `.act` class and updates `curPage`. Active pages: `dash`, `cal`, `tt`, `study`. On mobile (≤640px), `pg-mobile` replaces `pg-dash` entirely.

### State and data model
All app data lives in global JS variables, loaded from `localStorage` at startup:

| Variable | `localStorage` key | Contents |
|---|---|---|
| `rems` | `st_r5` | Reminders array |
| `evs` | `st_e5` | Events array |
| `hw` | `st_hw` | Homework array |
| `logs` | `st_l5` | Study log entries |
| `papers` | `st_p5` | Past papers |
| `exams` | `st_x5` | Exams array |
| `TT` | `st_ics` | Timetable (keyed by day name) |

Helper: `sv(k, v)` is shorthand for `localStorage.setItem(k, JSON.stringify(v))`.

### Supabase sync
The app is offline-first (localStorage) with optional Supabase cloud sync. The Supabase project URL is hardcoded at line ~3180. Auth uses magic links. Sync functions `sbGet`/`sbSet` mirror localStorage keys to a Supabase `kv` table keyed by user ID. The service worker bypasses all `supabase.co` requests (always network).

### Night mode
Toggled by adding/removing `body.night`. All night-mode overrides are CSS-only (no JS re-renders needed). Persisted as `st_night` in localStorage.

### Desktop vs mobile layout
- **Desktop**: floating pill sidebar (proximity-triggered, draggable, pinnable) at the left edge
- **Mobile (≤640px)**: bottom tab bar (`#mobile-nav`) + a separate full-screen mobile home page (`#pg-mobile`) with a swipeable pager (hero panel ↔ tiles panel)
- The custom canvas cursor and particle background are disabled on mobile

## Service worker cache

`CACHE_VERSION = 'stream-v1'` in `sw.js`. **Bump this string whenever you deploy changes** — it's the only mechanism that forces clients to pick up a new version.

## Key section locations in `index.html`

| Section | Approx. line |
|---|---|
| CSS — Night mode overrides | ~38 |
| CSS — Mobile layout | ~161 |
| CSS — Mobile home page | ~229 |
| HTML — page-stack / all pages | ~2021 |
| JS — Particle system | ~2602 |
| JS — Cursor + comet trail | ~2672 |
| JS — Pill sidebar | ~2855 |
| JS — Timetable data & render | ~2960 |
| JS — Supabase sync | ~3175 |
| JS — State (globals) | ~3297 |
| JS — Navigation (`goTo`) | ~3313 |
| JS — Dashboard render | ~3414 |
| JS — Reminders | ~3483 |
| JS — Homework | ~3525 |
| JS — Calendar render | ~3628 |
| JS — Study render | ~3709 |
| JS — Onboarding | ~4295 |
| JS — Subject colours | ~4500 |
| JS — Sync UI | ~4747 |
| JS — Search | ~5228 |
| JS — Mobile touch/swipe | ~5454 |
| JS — Mobile home | ~5480 |
| JS — Init | ~6095 |
