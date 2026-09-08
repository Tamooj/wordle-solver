# Wordle Solver

A Wordle assistant that takes the current board state and returns a ranked list
of valid candidate words, sorted by Shannon entropy (highest information gain
first).

## Status

Working implementation exists as a Claude.ai artifact (`src/wordle-solver.jsx`).
Not yet ported outside that sandbox. See [`docs/handoff.md`](docs/handoff.md)
for the full architecture writeup, dead ends already ruled out, and porting
options under consideration (standalone HTML, PWA, Capacitor/iOS, React Native).

## Layout

- `src/wordle-solver.jsx` — working implementation (React/JSX), currently
  sandbox-shaped (embedded word list split across two string constants to fit
  the 128KB artifact cap). Will be reworked as the port target is decided.
- `docs/handoff.md` — architecture notes and porting considerations.
