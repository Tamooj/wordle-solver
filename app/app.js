const { useState, useEffect } = React;

function applyFilters(greens, yellows, elimInput) {
  // Permissive parsing: accepts "abf", "a,b,f", "A B F", mixed case, dupes — all fine.
  const eliminated = new Set(
    elimInput.toLowerCase().split(/[^a-z]+/).join("").split("")
  );
  return WORDS.filter(word => {
    for (let i = 0; i < 5; i++) {
      if (greens[i] && word[i] !== greens[i].toLowerCase()) return false;
    }
    for (const letter of eliminated) {
      if (word.includes(letter)) return false;
    }
    for (const { letter, positions } of yellows) {
      const l = letter.toLowerCase();
      if (!l) continue;
      if (!word.includes(l)) return false;
      for (const pos of positions) {
        if (word[pos - 1] === l) return false;
      }
    }
    return true;
  });
}

// Compute the Wordle feedback pattern ("GYBBG" etc) for guessing `guess`
// when the true answer is `answer`. G=green, Y=yellow, B=gray.
function getPattern(guess, answer) {
  const pattern = new Array(5).fill("B");
  const answerLetters = answer.split("");
  const used = new Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answerLetters[i]) {
      pattern[i] = "G";
      used[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (pattern[i] === "G") continue;
    const idx = answerLetters.findIndex((l, j) => l === guess[i] && !used[j]);
    if (idx !== -1) {
      pattern[i] = "Y";
      used[idx] = true;
    }
  }
  return pattern.join("");
}

// Shannon entropy (bits) for each guess against the remaining answer pool.
// Higher entropy = guess splits remaining candidates into more, smaller,
// more-even buckets = eliminates more of the field on average.
function computeEntropy(guessPool, answerPool) {
  const n = answerPool.length;
  if (n === 0) return [];
  return guessPool.map(guess => {
    const buckets = new Map();
    for (const answer of answerPool) {
      const pattern = getPattern(guess, answer);
      buckets.set(pattern, (buckets.get(pattern) || 0) + 1);
    }
    let entropy = 0;
    for (const count of buckets.values()) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }
    return { word: guess, entropy };
  });
}

// Cost driver is guessPool.length * answerPool.length. Cap it so the UI
// never freezes; above this we skip entropy and fall back to alphabetical.
const ENTROPY_BUDGET = 3000000;

function WordleSolver() {
  const [greens, setGreens] = useState(["", "", "", "", ""]);
  const [yellows, setYellows] = useState([]);
  const [elimInput, setElimInput] = useState("");
  const [results, setResults] = useState([]);
  const [entropyNote, setEntropyNote] = useState("");
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    const remaining = applyFilters(greens, yellows, elimInput);

    if (remaining.length <= 1) {
      setResults(remaining.map(w => ({ word: w, entropy: 0 })));
      setEntropyNote("");
      return;
    }

    // Guess pool = remaining valid candidates only, so every word shown
    // both satisfies your constraints AND is ranked by information gain.
    // Cost is remaining.length^2 — only large if you have very few constraints.
    const cost = remaining.length * remaining.length;
    if (cost > ENTROPY_BUDGET) {
      setResults(remaining.slice(0, 200).map(w => ({ word: w, entropy: null })));
      setEntropyNote(`Too many candidates (${remaining.length}) to rank by entropy — showing alphabetically. Add a constraint to narrow it down.`);
      return;
    }

    setComputing(true);
    const scored = computeEntropy(remaining, remaining);
    scored.sort((a, b) => b.entropy - a.entropy);
    setResults(scored);
    setEntropyNote("");
    setComputing(false);
  }, [greens, yellows, elimInput]);

  function updateGreen(i, val) {
    const g = [...greens]; g[i] = val.slice(-1).toLowerCase(); setGreens(g);
  }
  function addYellow() { setYellows([...yellows, { letter: "", positions: [] }]); }
  function updateYellowLetter(i, val) {
    const y = [...yellows]; y[i] = { ...y[i], letter: val.slice(-1).toLowerCase() }; setYellows(y);
  }
  function toggleYellowPos(i, pos) {
    const y = [...yellows];
    const positions = y[i].positions.includes(pos)
      ? y[i].positions.filter(p => p !== pos)
      : [...y[i].positions, pos];
    y[i] = { ...y[i], positions };
    setYellows(y);
  }
  function removeYellow(i) { setYellows(yellows.filter((_, idx) => idx !== i)); }

  const s = {
    page: { minHeight: "100vh", background: "#121213", color: "#fff", fontFamily: "'Courier New', monospace", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center" },
    label: (color) => ({ fontSize: 11, color, letterSpacing: 3, display: "block", marginBottom: 8, textTransform: "uppercase" }),
    section: { width: "100%", maxWidth: 420, marginBottom: 20 },
    tile: (active, color) => ({ width: 48, height: 48, textAlign: "center", fontSize: 20, fontWeight: 900, background: active ? color : "#3a3a3c", color: "#fff", border: "2px solid #565758", borderRadius: 4, outline: "none" }),
    posBtn: (active) => ({ width: 32, height: 32, background: active ? "#b59f3b" : "#3a3a3c", color: "#fff", border: "1px solid #565758", borderRadius: 4, cursor: "pointer", fontWeight: 900, fontSize: 13 }),
    resultTile: (bg) => ({ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: bg, border: "2px solid #565758", borderRadius: 3, fontSize: 16, fontWeight: 900 }),
  };

  return (
    <div style={s.page}>
      <div style={{ fontSize: 11, letterSpacing: 6, color: "#818384", marginBottom: 4 }}>Wordle</div>
      <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>SOLVER</h1>
      <div style={{ fontSize: 11, color: "#818384", marginBottom: 24 }}>
        {WORDS.length} words · {results.length} matches
      </div>

      <section style={s.section}>
        <label style={s.label("#538d4e")}>■ Green — confirmed positions</label>
        <div style={{ display: "flex", gap: 6 }}>
          {greens.map((g, i) => (
            <input key={i} value={g.toUpperCase()} onChange={e => updateGreen(i, e.target.value)}
              maxLength={1} placeholder={(i+1).toString()} style={s.tile(!!g, "#538d4e")} />
          ))}
        </div>
      </section>

      <section style={s.section}>
        <label style={s.label("#b59f3b")}>■ Yellow — in word, tap excluded positions</label>
        {yellows.map((y, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input value={y.letter.toUpperCase()} onChange={e => updateYellowLetter(i, e.target.value)}
              maxLength={1} placeholder="?" style={s.tile(!!y.letter, "#b59f3b")} />
            <span style={{ color: "#818384", fontSize: 11 }}>NOT:</span>
            {[1,2,3,4,5].map(pos => (
              <button key={pos} onClick={() => toggleYellowPos(i, pos)} style={s.posBtn(y.positions.includes(pos))}>{pos}</button>
            ))}
            <button onClick={() => removeYellow(i)} style={{ background: "none", border: "none", color: "#818384", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
        ))}
        <button onClick={addYellow} style={{ background: "#3a3a3c", border: "1px solid #565758", color: "#818384", borderRadius: 4, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>
          + ADD YELLOW
        </button>
      </section>

      <section style={s.section}>
        <label style={s.label("#818384")}>■ Gray — eliminated letters (just type them, e.g. astcon)</label>
        <input value={elimInput} onChange={e => setElimInput(e.target.value)}
          style={{ width: "100%", background: "#3a3a3c", color: "#fff", border: "1px solid #565758", borderRadius: 4, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2 }} />
      </section>

      {results.length > 0 ? (
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ fontSize: 11, color: "#818384", letterSpacing: 3, marginBottom: 4 }}>
            {results.length} MATCHES{results[0].entropy !== null ? " · SORTED BY ENTROPY (BEST FIRST)" : ""}
          </div>
          {entropyNote && (
            <div style={{ fontSize: 11, color: "#b59f3b", marginBottom: 12, lineHeight: 1.4 }}>{entropyNote}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: entropyNote ? 0 : 12 }}>
            {results.slice(0, 60).map(({ word, entropy }, wi) => (
              <div key={wi} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {word.split("").map((letter, li) => {
                    const isGreen = greens[li]?.toLowerCase() === letter;
                    const isYellow = yellows.some(y => y.letter.toLowerCase() === letter);
                    const bg = isGreen ? "#538d4e" : isYellow ? "#b59f3b" : "#3a3a3c";
                    return <div key={li} style={s.resultTile(bg)}>{letter.toUpperCase()}</div>;
                  })}
                </div>
                {entropy !== null && (
                  <span style={{ fontSize: 12, color: "#818384" }}>{entropy.toFixed(2)} bits</span>
                )}
              </div>
            ))}
          </div>
          {results.length > 60 && <div style={{ color: "#818384", fontSize: 12, marginTop: 12 }}>+{results.length - 60} more — add constraints to narrow down.</div>}
        </div>
      ) : (
        <div style={{ color: "#818384", fontSize: 13 }}>No matches. Check constraints.</div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WordleSolver />);
