# Wentropy

A Wordle assistant that takes the current board state and returns a ranked list
of valid candidate words, sorted by Shannon entropy (highest information gain
first).

## Status

Live as an installable PWA at [tamooj.github.io/wentropy](https://tamooj.github.io/wentropy/).
Works fully offline once installed. See [`docs/handoff.md`](docs/handoff.md)
for the original architecture writeup and porting notes.

## Layout

- `app/` — the deployed PWA (buildless: CDN React/Babel, no build step).
  Auto-deploys to GitHub Pages on push via
  [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
- `src/wordle-solver.jsx` — original Claude.ai artifact implementation, kept
  for reference. `app/` is the actively maintained version.
- `docs/handoff.md` — architecture notes and porting considerations from the
  original sandbox-to-PWA handoff.
