import { useState, useRef, useEffect } from "react";

import PUZZLES from "../puzzles.json";

// ─── UTILS ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFF_LABELS = [
  { label: "🟠 Seedha Saadha", bg: "#FAC775", fg: "#633806" },
  { label: "🟢 Theek Hai",     bg: "#9FE1CB", fg: "#085041" },
  { label: "🔵 Thoda Mushkil", bg: "#B5D4F4", fg: "#0C447C" },
  { label: "🟣 Bahut Mushkil", bg: "#CECBF6", fg: "#3C3489" },
];

// Mid-tone versions of each pastel: brighter than bg, lighter than fg
const BG_TO_MID = {
  "#FAC775": "#F5A623",
  "#9FE1CB": "#3DBD9A",
  "#B5D4F4": "#5B9FE4",
  "#CECBF6": "#9B8FEA",
};

const EPOCH = new Date(2026, 4, 19); // May 19 2026 → puzzle 4 lands on May 22

function getTodayPuzzleIdx() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((today - EPOCH) / (1000 * 60 * 60 * 24));
  return ((days % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "knnections_progress";

function loadAllProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

// ─── CROSS-TAB SYNC ──────────────────────────────────────────────────────────

const syncChannel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("knnections_sync")
  : null;

function savePuzzleProgress(pidx, state) {
  try {
    const all = loadAllProgress();
    all[pidx] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    syncChannel?.postMessage({ type: "puzzle_update", pidx, state });
  } catch {}
}

// ─── GLOBAL CSS ──────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Yatra+One&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }

  @keyframes shake {
    0%,100%{transform:translateX(0)}
    15%{transform:translateX(-11px)}
    30%{transform:translateX(11px)}
    45%{transform:translateX(-8px)}
    60%{transform:translateX(8px)}
    75%{transform:translateX(-4px)}
    90%{transform:translateX(4px)}
  }
  @keyframes pop {
    0%,100%{transform:scale(1)}
    50%{transform:scale(1.04)}
  }
  @keyframes slideDown {
    from{opacity:0;transform:translateY(-16px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes toastIn {
    from{opacity:0;transform:translate(-50%,-10px) scale(0.93)}
    to{opacity:1;transform:translate(-50%,0) scale(1)}
  }
  @keyframes fadeUp {
    from{opacity:0;transform:translateY(22px)}
    to{opacity:1;transform:translateY(0)}
  }

  .slide-in { animation: slideDown 0.38s cubic-bezier(.22,.68,0,1.2); }
  .toast-anim { animation: toastIn 0.22s ease; }
  .fade-up { animation: fadeUp 0.48s ease; }

  .card-btn { transition: all 0.15s ease !important; }
  .card-btn:hover {
    transform: translateY(-4px) scale(1.03) !important;
    box-shadow: 0 8px 24px rgba(139,26,26,0.2) !important;
    border-color: #FF9933 !important;
    background: #FFF0CC !important;
  }
  .card-btn:active { transform: scale(0.96) !important; }

  .pill-btn { transition: all 0.14s ease !important; }
  .pill-btn:hover { filter: brightness(1.08); }
  .pill-btn:active { transform: scale(0.95) !important; }

  .tile-btn { transition: background 0.1s, border-color 0.1s, transform 0.12s, box-shadow 0.12s !important; }
  .tile-btn:hover { filter: brightness(0.93); }
  @media (max-width: 400px) {
    .tile-btn { font-size: 11px !important; min-height: 56px !important; }
  }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    width: 100%;
    max-width: 640px;
    margin-bottom: 18px;
  }
  @media (max-width: 480px) {
    .game-grid { gap: 5px; }
  }
`;

// ─── SHARE ───────────────────────────────────────────────────────────────────

const CAT_EMOJI = ["🟨", "🟩", "🟦", "🟪"];

function ShareButton({ puzzle, guessHistory, won, mistakes, showToast }) {
  function buildText() {
    const itemToCat = {};
    puzzle.categories.forEach((c, i) => c.items.forEach(item => { itemToCat[item] = i; }));
    const grid = guessHistory.map(guess =>
      guess.map(item => CAT_EMOJI[itemToCat[item]] ?? "⬜").join("")
    ).join("\n");
    const result = won
      ? `Jeet gaye! ${mistakes === 0 ? "Ek bhi galati nahi 🤩" : `Sirf ${mistakes} galati${mistakes === 1 ? "" : "yan"} 🌟`}`
      : "Game over 😔";
    return `कnnecशns\n${puzzle.titleEn}\n${result}\n\n${grid}`;
  }

  function share() {
    const text = buildText();
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(
        () => showToast("Clipboard mein copy ho gaya! 📋", true),
        () => showToast("Copy nahi hua 😕", false),
      );
    }
  }

  return (
    <button className="pill-btn" onClick={share} style={{
      background: "#8B1A1A", color: "#FFDB80", border: "none",
      borderRadius: 30, padding: "12px 28px", fontFamily: "'Mukta'", fontWeight: 700,
      fontSize: 16, cursor: "pointer",
    }}>Share karo 📤</button>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const DEV = import.meta.env.DEV;

export default function App() {
  const [screen, setScreen] = useState("home");
  const [pidx, setPidx] = useState(0);
  const todayIdx = getTodayPuzzleIdx();
  const [tiles, setTiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [anim, setAnim] = useState(null);
  const [toast, setToast] = useState(null);
  const [won, setWon] = useState(false);
  const [guessHistory, setGuessHistory] = useState([]);
  const [returnTo, setReturnTo] = useState("home");

  // Refs so the sync handler always sees current screen/pidx without stale closures
  const screenRef = useRef(screen);
  const pidxRef = useRef(pidx);
  screenRef.current = screen;
  pidxRef.current = pidx;

  useEffect(() => {
    if (!syncChannel) return;
    function handleSync({ data }) {
      if (data?.type !== "puzzle_update") return;
      const { pidx: updPidx, state } = data;
      if (screenRef.current !== "game" || pidxRef.current !== updPidx) return;
      setTiles(state.tiles);
      setSolved(state.solved);
      setMistakes(state.mistakes);
      setGuessHistory(state.guessHistory);
      setSelected([]);
      if (state.status === "won") {
        setWon(true);
        setTimeout(() => setScreen("end"), 1200);
      } else if (state.status === "lost") {
        setWon(false);
        setTimeout(() => setScreen("end"), 1200);
      } else {
        setToast({ text: "Doosri tab se sync ho gaya 🔄", good: true });
        setTimeout(() => setToast(null), 2600);
      }
    }
    syncChannel.addEventListener("message", handleSync);
    return () => syncChannel.removeEventListener("message", handleSync);
  }, []);

  const puzzle = PUZZLES[pidx];
  const MAX_ERR = 4;

  const isSolved = item => solved.some(c => c.items.includes(item));

  function showToast(text, good) {
    setToast({ text, good });
    setTimeout(() => setToast(null), 2600);
  }

  function startGame(i, from = "home") {
    const all = loadAllProgress();
    const saved = all[i];
    setReturnTo(from);

    if (saved && (saved.status === "won" || saved.status === "lost")) {
      // Already finished — show the end screen with saved results
      setPidx(i);
      setTiles(saved.tiles);
      setSolved(saved.solved);
      setMistakes(saved.mistakes);
      setGuessHistory(saved.guessHistory);
      setWon(saved.status === "won");
      setAnim(null);
      setToast(null);
      setScreen("end");
      return;
    }

    if (saved && saved.status === "playing") {
      // Resume in-progress game
      setPidx(i);
      setTiles(saved.tiles);
      setSolved(saved.solved);
      setMistakes(saved.mistakes);
      setGuessHistory(saved.guessHistory);
      setSelected([]);
      setAnim(null);
      setToast(null);
      setWon(false);
      setScreen("game");
      return;
    }

    // Fresh start
    const shuffledTiles = shuffle(PUZZLES[i].categories.flatMap(c => c.items));
    setPidx(i);
    setTiles(shuffledTiles);
    setSelected([]);
    setSolved([]);
    setMistakes(0);
    setAnim(null);
    setToast(null);
    setWon(false);
    setGuessHistory([]);
    savePuzzleProgress(i, { tiles: shuffledTiles, solved: [], mistakes: 0, guessHistory: [], status: "playing" });
    setScreen("game");
  }

  function toggle(item) {
    if (anim || isSolved(item)) return;
    setSelected(p =>
      p.includes(item) ? p.filter(x => x !== item) : p.length < 4 ? [...p, item] : p
    );
  }

  function submit() {
    if (selected.length !== 4 || anim) return;
    const guess = [...selected];
    const newHistory = [...guessHistory, guess];
    setGuessHistory(newHistory);
    const match = puzzle.categories.find(c =>
      selected.every(s => c.items.includes(s)) && c.items.every(i => selected.includes(i))
    );
    if (match && !solved.find(s => s.name === match.name)) {
      setAnim("pop");
      setTimeout(() => {
        setAnim(null);
        const ns = [...solved, match];
        setSolved(ns);
        setSelected([]);
        if (ns.length === 4) {
          savePuzzleProgress(pidx, { tiles, solved: ns, mistakes, guessHistory: newHistory, status: "won" });
          setWon(true);
          setScreen("end");
        } else {
          savePuzzleProgress(pidx, { tiles, solved: ns, mistakes, guessHistory: newHistory, status: "playing" });
          const msgs = ["Wah wah! 🎉", "Bilkul sahi! ✨", "Bahut achha! 🙌"];
          showToast(msgs[ns.length - 1] || "Sahi! 🎊", true);
        }
      }, 520);
    } else {
      const oneAway = puzzle.categories.some(c =>
        selected.filter(s => c.items.includes(s)).length === 3
      );
      const nm = mistakes + 1;
      setMistakes(nm);
      setAnim("shake");
      showToast(
        oneAway ? "Ek se chook gaye! Dobara socho 😅" : "Nahi yaar! Phir try karo 🙈",
        false
      );
      setTimeout(() => {
        setAnim(null);
        setSelected([]);
        if (nm >= MAX_ERR) {
          savePuzzleProgress(pidx, { tiles, solved, mistakes: nm, guessHistory: newHistory, status: "lost" });
          setTimeout(() => { setWon(false); setScreen("end"); }, 420);
        } else {
          savePuzzleProgress(pidx, { tiles, solved, mistakes: nm, guessHistory: newHistory, status: "playing" });
        }
      }, 660);
    }
  }

  const activeTiles = tiles.filter(t => !isSolved(t));

  const base = {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #FEF3DC 0%, #FCE5C0 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "36px 24px 64px",
    fontFamily: "'Mukta', sans-serif",
    position: "relative",
  };

  // ─── HOME ─────────────────────────────────────────────────────────────────
  if (screen === "home") {
    const progress = loadAllProgress();
    const todayStatus = progress[todayIdx]?.status;
    const todayLabel =
      todayStatus === "won" ? "Dekho Result 🎊" :
      todayStatus === "lost" ? "Dekho Result 😔" :
      todayStatus === "playing" ? "Jaari Rakho ▶" :
      "Khelo ▶";
    return (
      <>
        <style>{CSS}</style>
        <div style={{ ...base, justifyContent: "center" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'Yatra One', cursive", fontSize: 72, color: "#8B1A1A", margin: "0 0 16px", lineHeight: 1 }}>
              कnnecशns
            </h1>
            <p style={{ color: "#7A5C30", fontSize: 16, maxWidth: 460, margin: "0 auto", lineHeight: 1.75 }}>
              16 tiles, 4 chhuppe groups. Lekin <b>bahut saare words do jagah fit lagte hain</b> — wahi toh maza hai!
            </p>
          </div>

          <div style={{ background: "#FFF7E8", border: "1.5px solid #E8C870", borderRadius: 14, padding: "18px 28px", maxWidth: 520, width: "100%", marginBottom: 36, fontSize: 15, color: "#6B4226", lineHeight: 1.85, textAlign: "center" }}>
            <b>Kaise khelein?</b> 4 tiles chunke <b>Submit</b> karo. Ek galati = ek 🔴 khatam. 4 galatiyan = game over!
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 36, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="pill-btn" onClick={() => startGame(todayIdx)} style={{
              background: "#8B1A1A", color: "#FFDB80", border: "none",
              borderRadius: 30, padding: "10px 32px", fontFamily: "'Mukta'", fontWeight: 700,
              fontSize: 17, cursor: "pointer",
            }}>{todayLabel}</button>
            <button className="pill-btn" onClick={() => setScreen("archive")} style={{
              background: "transparent", color: "#8B1A1A", border: "2px solid #8B1A1A",
              borderRadius: 30, padding: "10px 20px", fontFamily: "'Mukta'", fontWeight: 700,
              fontSize: 16, cursor: "pointer",
            }}>📚 Purane</button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {DIFF_LABELS.map(d => (
              <span key={d.label} style={{ background: d.bg, borderRadius: 20, padding: "6px 16px", color: d.fg, fontSize: 13, fontWeight: 600 }}>{d.label}</span>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ─── ARCHIVE ──────────────────────────────────────────────────────────────
  if (screen === "archive") {
    const progress = loadAllProgress();
    return (
      <>
        <style>{CSS}</style>
        <div style={base}>
          <div style={{ width: "100%", maxWidth: 520 }}>
            <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: "#8B1A1A", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 16, cursor: "pointer", padding: 0, marginBottom: 20 }}>
              ← Wapas
            </button>
            <h2 style={{ fontFamily: "'Yatra One', cursive", color: "#8B1A1A", fontSize: 32, margin: "0 0 6px" }}>Purane Puzzles</h2>
            <p style={{ color: "#7A5C30", fontSize: 15, margin: "0 0 24px" }}>Woh puzzles jo aap miss kar gaye 😄</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PUZZLES.map((p, i) => {
                if (!DEV && i >= todayIdx) return null;
                const saved = progress[i];
                const status = saved?.status;
                const badge =
                  status === "won" ? { icon: "🎊", label: "Jeet!", color: "#2E7D32" } :
                  status === "lost" ? { icon: "😔", label: "Game over", color: "#B71C1C" } :
                  status === "playing" ? { icon: "⏸", label: `${saved.solved.length}/4`, color: "#7A5C30" } :
                  null;
                return (
                  <div key={i} className="card-btn" onClick={() => startGame(i, "archive")} style={{
                    background: "#FFF7E8", border: "1.5px solid #E8C870", borderRadius: 14,
                    padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Yatra One', cursive", color: "#8B1A1A", fontSize: 20, marginBottom: 4 }}>{p.titleEn}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.categories.map((c, j) => {
                          const wasSolved = saved?.solved?.some(s => s.name === c.name);
                          return (
                            <span key={j} style={{
                              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
                              background: wasSolved ? (BG_TO_MID[c.bg] ?? c.bg) : c.bg,
                            }} />
                          );
                        })}
                      </div>
                    </div>
                    {badge ? (
                      <span style={{ color: badge.color, fontWeight: 700, fontSize: 15, textAlign: "right", whiteSpace: "nowrap" }}>
                        {badge.icon} {badge.label}
                      </span>
                    ) : (
                      <span style={{ color: "#8B1A1A", fontSize: 20, fontWeight: 700 }}>▶</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── END ──────────────────────────────────────────────────────────────────
  if (screen === "end") return (
    <>
      <style>{CSS}</style>
      <div style={{ ...base, justifyContent: "center", textAlign: "center" }}>
        <div className="fade-up">
          <div style={{ fontSize: 90, lineHeight: 1, marginBottom: 12 }}>{won ? "🎊" : "😔"}</div>
          <h2 style={{ fontFamily: "'Yatra One', cursive", fontSize: 38, color: "#8B1A1A", margin: "0 0 8px" }}>
            {won ? "Bahut Badiya!" : "Agli Baar!"}
          </h2>
          <p style={{ color: "#7A5C30", marginBottom: 28, fontSize: 16, lineHeight: 1.6 }}>
            {won
              ? `Sirf ${mistakes} galati${mistakes === 1 ? "" : "yan"} ke saath — zabardast! 🌟`
              : "4 galatiyon ke baad game over. Tricky the na? 😄"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32, maxWidth: 640, width: "100%" }}>
            {puzzle.categories.map((cat, i) => (
                <div key={i} style={{
                  background: cat.bg, color: cat.fg, borderRadius: 12,
                  padding: "14px 22px",
                  textAlign: "center",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 3 }}>{cat.name}</div>
                  <div style={{ fontSize: 15 }}>{cat.items.join(" · ")}</div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, fontStyle: "italic" }}>{cat.hindi}</div>
                </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="pill-btn" onClick={() => setScreen(returnTo)} style={{
              background: "transparent", color: "#8B1A1A", border: "2px solid #8B1A1A",
              borderRadius: 30, padding: "12px 26px", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 16, cursor: "pointer",
            }}>{returnTo === "archive" ? "← Wapas" : "← Ghar Wapas"}</button>
            <ShareButton puzzle={puzzle} guessHistory={guessHistory} won={won} mistakes={mistakes} showToast={showToast} />
          </div>
        </div>
      </div>
    </>
  );

  // ─── GAME ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div style={base}>
        {toast && (
          <div className="toast-anim" style={{
            position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)",
            background: toast.good ? "#2E7D32" : "#B71C1C",
            color: "#fff", padding: "11px 28px", borderRadius: 30,
            fontFamily: "'Mukta'", fontWeight: 700, fontSize: 16, zIndex: 999,
            whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          }}>{toast.text}</div>
        )}

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 640, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setScreen(returnTo)} style={{ background: "none", border: "none", color: "#8B1A1A", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 16, cursor: "pointer", padding: 0 }}>
            ← Wapas
          </button>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "'Yatra One', cursive", color: "#8B1A1A", fontSize: 24 }}>{puzzle.title}</span>
          </div>
          <div style={{ width: 80 }} />
        </div>

        {/* Solved banners */}
        <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 8, marginBottom: solved.length ? 10 : 0 }}>
          {solved.map((cat, i) => (
            <div key={i} className="slide-in" style={{ background: cat.bg, color: cat.fg, borderRadius: 10, padding: "11px 20px", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{cat.name}</div>
              <div style={{ fontSize: 14 }}>{cat.items.join(" · ")}</div>
            </div>
          ))}
        </div>

        {/* Tile grid */}
        <div
          className="game-grid"
          style={{ animation: anim === "shake" ? "shake 0.66s" : anim === "pop" ? "pop 0.52s" : "none" }}
        >
          {activeTiles.map(item => {
            const sel = selected.includes(item);
            const len = item.replace(/\s/g, "").length;
            const fs = len > 11 ? 13 : len > 8 ? 15 : len > 6 ? 17 : 19;
            return (
              <button
                key={item}
                className="tile-btn"
                onClick={() => toggle(item)}
                style={{
                  background: sel ? "#3A2000" : "#FFF8EE",
                  color: sel ? "#FFDB80" : "#3A2000",
                  border: `2px solid ${sel ? "#FF9933" : "#DFCCA0"}`,
                  borderRadius: 10, padding: "4px 4px", minHeight: 64,
                  fontFamily: "'Mukta', sans-serif", fontWeight: 700, fontSize: fs,
                  cursor: "pointer", lineHeight: 1.25,
                  transform: sel ? "scale(1.05)" : "scale(1)",
                  boxShadow: sel ? "0 3px 10px rgba(255,153,51,0.45)" : "0 1px 3px rgba(0,0,0,0.07)",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Mistake dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ color: "#7A5C30", fontSize: 15, fontWeight: 600 }}>Galatiyan:</span>
          {Array.from({ length: MAX_ERR }).map((_, i) => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: i < mistakes ? "#B71C1C" : "#E0C898",
              transition: "background 0.3s, transform 0.2s",
              transform: i === mistakes - 1 ? "scale(1.3)" : "scale(1)",
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="pill-btn" onClick={() => setSelected([])} style={{
            background: "transparent", color: "#8B1A1A", border: "2px solid #8B1A1A",
            borderRadius: 30, padding: "11px 24px", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>Hatao ✕</button>
          <button className="pill-btn" onClick={() => setTiles(t => shuffle([...t]))} style={{
            background: "transparent", color: "#8B1A1A", border: "2px solid #8B1A1A",
            borderRadius: 30, padding: "11px 24px", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>Shuffle 🔀</button>
          <button className="pill-btn" onClick={submit} style={{
            background: selected.length === 4 ? "#8B1A1A" : "#C9AA7C",
            color: selected.length === 4 ? "#FFDB80" : "#fff", border: "none",
            borderRadius: 30, padding: "11px 30px", fontFamily: "'Mukta'", fontWeight: 700, fontSize: 16,
            cursor: selected.length === 4 ? "pointer" : "default", transition: "background 0.2s",
          }}>Submit ✓</button>
        </div>
      </div>
    </>
  );
}
