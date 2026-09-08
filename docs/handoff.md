# Wordle Solver — Project Handoff Brief

## What This Is

A Wordle assistant that takes the current board state as input and returns a ranked list of valid candidate words, sorted by Shannon entropy (highest information gain first). Built in React/JSX. The accompanying `wordle-solver.jsx` file is the complete, working implementation.

## Current State

The solver works correctly in the Claude.ai artifact sandbox. The next step is to port it outside that environment — likely as a standalone HTML file, PWA, or native mobile app. The target platform decision is still open (iOS support may be a requirement), so the port format should be chosen accordingly.

---

## Architecture

### Word List

The full Wordle word list (~14,855 words, sourced from `https://raw.githubusercontent.com/tabatkins/wordle-list/main/words`) is embedded directly in the JSX as two string constants `W1` and `W2`, concatenated and split at runtime:

```js
const WORDS = (W1 + "," + W2).split(",");
```

**Why two strings:** The Claude.ai artifact sandbox has a 128KB file size cap. The word list as a JSON array is ~133KB; as two comma-separated strings it's ~90KB total. Outside the sandbox this constraint no longer applies, so the word list can be imported normally (a JSON file, a module export, or fetched at runtime from the GitHub URL above).

### Filtering (`applyFilters`)

Pure function, no side effects. Filters `WORDS` against three constraint types:

1. **Green** — letter must be at exact position (array of 5 strings, `""` if unknown)
2. **Yellow** — letter must appear somewhere in the word, but NOT at the excluded positions (array of `{letter, positions[]}`)
3. **Gray/eliminated** — letter must not appear anywhere (parsed permissively from a raw string — any non-alpha characters stripped, case-normalized, duplicates ignored via `Set`)

### Pattern Matching (`getPattern`)

Computes the Wordle feedback string (e.g. `"GYBBG"`) for a guess against a known answer. Uses a **two-pass approach** — greens first, then yellows — to correctly handle duplicate letters. This is important: a naive single-pass gets duplicate letter scoring wrong.

```
Pass 1: Mark greens, flag those answer positions as consumed
Pass 2: For each non-green guess letter, find an unconsumed matching answer letter → yellow
Anything remaining → gray (B)
```

### Entropy Ranking (`computeEntropy`)

For each word in the guess pool, simulates guessing it against every word in the answer pool. Buckets results by pattern string, then computes Shannon entropy:

```
H = -Σ p(bucket) * log2(p(bucket))
```

Higher entropy = the guess partitions the remaining candidates into more, smaller, more-even buckets = eliminates more of the field on average regardless of the true answer.

**Current configuration:** Both the guess pool and answer pool are set to the filtered remaining candidates (not the full dictionary). This keeps cost at O(n²) where n is the remaining set size, which is fast for typical mid-game state (tens to low hundreds of words). The full-dictionary-as-guess-pool approach was considered but not used, as it would surface words that don't satisfy the current constraints (i.e., words already ruled out as possible answers).

**Budget cap:** If `remaining.length² > 3,000,000` (i.e., more than ~1,732 candidates remain), entropy ranking is skipped and results are shown alphabetically with a note. This prevents UI freezing on early-game states with few constraints.

---

## Dead Ends and Why We Abandoned Them

### Claude API for word generation

First approach: call the Claude API with constraint descriptions, ask it to return candidate words as JSON. Abandoned because:
- The model reliably hallucinated constraint violations (e.g., returned words with `e` in position 4 when explicitly told `e` is not in position 4)
- JSON parsing was fragile — the model occasionally returned multiple arrays or preamble text, breaking `JSON.parse`
- Deterministic local filtering is strictly better for this use case

### Fetching the word list at runtime

Tried fetching from `https://raw.githubusercontent.com/tabatkins/wordle-list/main/words` inside the artifact. The artifact sandbox blocks outbound network requests, so this silently failed. Embedding the list was the fix. Outside the sandbox, runtime fetching works fine and is the cleaner approach.

### Full dictionary as guess pool

Implemented and tested: using all ~14,855 words as the guess pool (scored against the filtered remaining set as answer pool). Abandoned because it surfaced eliminated words in the output — words that can't be the answer but score well informationally. The current approach (guess pool = remaining candidates) ensures every displayed word is both a valid possible answer and optimally ranked.

---

## Input UX Notes

- **Green tiles:** 5 text inputs, one per position. Empty = unknown.
- **Yellow letters:** Each yellow gets a letter input plus toggle buttons for positions 1–5. Multiple excluded positions per letter are supported (and necessary — a letter may appear yellow in multiple guesses at different positions).
- **Gray/eliminated:** A single text field. Parsing is intentionally permissive: `astcon`, `a,s,t,c,o,n`, `A S T C O N` all parse identically. Implementation strips non-alpha, lowercases, deduplicates via `Set`.

A common input error to watch for: if a letter appears yellow in one guess and gray in another (possible when a word has two of the same letter), the user may enter it in both yellow and gray. The gray filter would then eliminate it, producing zero matches. The UI does not currently warn about this conflict — worth considering for a future improvement.

---

## Porting Considerations

### Standalone HTML file
Replace module-style `import` with CDN-loaded React + Babel (transpiles JSX in-browser). No build step, opens directly in Chrome. Viable for personal/mobile use via file sharing. Main constraint: `file://` URLs don't support service workers, so offline PWA behavior requires a local server or hosting.

### PWA
Add a `manifest.json` and service worker to the HTML approach. Gives a home-screen icon, standalone launch (no browser chrome), and true offline support. Requires HTTPS or localhost — GitHub Pages or Netlify provide this for free with drag-and-drop deploy. Best balance of simplicity and app-like behavior for Android.

### iOS
PWA support on iOS is functional but historically lagged behind Android (service worker limitations, no install prompt until recently). A Capacitor wrapper around the existing React app produces a proper iOS IPA with minimal code changes and is the recommended path if App Store distribution or full iOS native behavior is needed.

### React Native / Expo
More work to port (no direct JSX-to-RN path — components need rewriting), but gives true native performance and full platform access. Probably overkill for this use case.

---

## Files

- `wordle-solver.jsx` — complete working implementation, ready to run in a React environment
- `wordle-solver-handoff.md` — this document
