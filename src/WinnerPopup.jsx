import { useEffect, useState } from "react"

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700;800;900&display=swap');
  :root {
    --bg:     #0a0e1a;
    --card:   rgba(14,20,38,0.95);
    --border: rgba(80,110,180,0.25);
    --sky:    #7ec8e3;
    --mint:   #34d399;
    --yellow: #fbbf24;
    --pink:   #f472b6;
    --purple: #a78bfa;
    --red:    #fb7185;
    --text:   #d0ddf0;
    --dim:    #5a6e90;
  }
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans Hebrew', sans-serif; }

  @keyframes fadeIn     { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp    { from { opacity: 0; transform: translateY(40px) scale(.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
  @keyframes float      { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
  @keyframes pulse      { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
  @keyframes spin       { to { transform: rotate(360deg) } }
  @keyframes shimmer    { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
  @keyframes confettiFall {
    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1 }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0 }
  }
  @keyframes starPop {
    0%   { transform: scale(0) rotate(-30deg); opacity: 0 }
    60%  { transform: scale(1.3) rotate(10deg); opacity: 1 }
    100% { transform: scale(1) rotate(0deg);   opacity: 1 }
  }
  @keyframes ringPulse {
    0%   { box-shadow: 0 0 0 0 rgba(251,191,36,.6) }
    70%  { box-shadow: 0 0 0 20px rgba(251,191,36,0) }
    100% { box-shadow: 0 0 0 0 rgba(251,191,36,0) }
  }

  .wp-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(4,7,16,0.88);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn .3s ease;
    direction: rtl;
  }

  .wp-card {
    background: linear-gradient(160deg, rgba(16,22,44,0.98), rgba(10,14,28,0.98));
    border: 1px solid rgba(251,191,36,.35);
    border-radius: 24px;
    padding: 32px 28px 28px;
    width: min(420px, 92vw);
    position: relative;
    overflow: hidden;
    animation: slideUp .45s cubic-bezier(.22,1,.36,1);
    box-shadow: 0 0 60px rgba(251,191,36,.12), 0 24px 60px rgba(0,0,0,.6);
    font-family: 'Noto Sans Hebrew', sans-serif;
  }

  .wp-glow {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,.1) 0%, transparent 70%);
  }

  .wp-close {
    position: absolute; top: 14px; left: 14px;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
    color: var(--dim); border-radius: 50%; width: 32px; height: 32px;
    font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all .18s; font-family: 'Noto Sans Hebrew', sans-serif;
  }
  .wp-close:hover { background: rgba(255,255,255,.13); color: var(--text); }

  .wp-trophy {
    font-size: 72px; text-align: center; display: block;
    animation: float 2.8s ease-in-out infinite;
    filter: drop-shadow(0 0 24px rgba(251,191,36,.5));
    margin-bottom: 6px;
  }

  .wp-title {
    text-align: center; font-size: 14px; font-weight: 700; letter-spacing: 2px;
    color: var(--dim); text-transform: uppercase; margin-bottom: 10px;
  }

  .wp-name {
    text-align: center;
    font-size: 38px; font-weight: 900;
    background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    background-size: 200% auto;
    animation: shimmer 2.5s linear infinite;
    margin-bottom: 6px;
    line-height: 1.1;
  }

  .wp-badge {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-bottom: 22px;
  }

  .wp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(251,191,36,.3), transparent);
    margin-bottom: 20px;
  }

  .wp-stats {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 10px; margin-bottom: 22px;
  }

  .wp-stat {
    background: rgba(0,0,0,.3);
    border: 1px solid rgba(80,110,180,.2);
    border-radius: 14px; padding: 12px 8px;
    text-align: center;
  }

  .wp-stat-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1px;
    color: var(--dim); text-transform: uppercase; margin-bottom: 5px;
  }

  .wp-stat-value {
    font-size: 17px; font-weight: 900;
  }

  .wp-diff-bar {
    background: rgba(0,0,0,.3); border-radius: 14px; padding: 14px 16px;
    border: 1px solid rgba(52,211,153,.2); margin-bottom: 22px;
    display: flex; align-items: center; gap: 12px;
  }

  .wp-btn {
    width: 100%; padding: 13px; border-radius: 14px; border: none;
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 800; font-size: 15px;
    cursor: pointer; transition: all .18s;
    background: linear-gradient(135deg, #d97706, #fbbf24);
    color: #1a1000;
    box-shadow: 0 4px 20px rgba(251,191,36,.35);
    animation: ringPulse 2s ease infinite;
  }
  .wp-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(251,191,36,.5); }
  .wp-btn:active { transform: scale(.97); }

  .confetti-piece {
    position: fixed; top: -20px; pointer-events: none; border-radius: 3px;
    animation: confettiFall linear forwards;
  }

  .star-decoration {
    position: absolute; pointer-events: none;
    animation: starPop .5s cubic-bezier(.22,1,.36,1) forwards;
  }
`

const CONFETTI_COLORS = ["#fbbf24","#f472b6","#34d399","#7ec8e3","#a78bfa","#fb7185","#fde68a"]

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: Math.random() * 8 + 5,
    duration: Math.random() * 2.5 + 2,
    delay: Math.random() * 1.5,
    rotation: Math.random() * 360,
  }))
  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.x}%`,
          width: `${p.size}px`,
          height: `${p.size * 0.5}px`,
          background: p.color,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
          transform: `rotate(${p.rotation}deg)`,
          opacity: 0,
        }} />
      ))}
    </>
  )
}

const fmtDate = (ts) => !ts ? "--" : new Date(ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const fmtDiff = (ms) => {
  if (ms == null) return "--"
  const a = Math.abs(ms), h = Math.floor(a / 3600000), m = Math.floor((a % 3600000) / 60000), s = Math.floor((a % 60000) / 1000)
  if (h > 0) return `${h}ש׳ ${m}ד׳`
  if (m > 0) return `${m}ד׳ ${s}שנ׳`
  return `${s} שנ׳`
}

/* ─────────────────────────────────────────
   WinnerPopup
   Props:
     winner  – { name, badge: { emoji, label, color }, totalWins }
     alarmAt – timestamp of the actual alarm
     betTs   – timestamp of the winner's guess
     onClose – callback
───────────────────────────────────────── */
export default function WinnerPopup({ winner, alarmAt, betTs, onClose }) {
  const [show, setShow] = useState(false)
  const diff = Math.abs(betTs - alarmAt)

  useEffect(() => {
    // Slight delay so the animation feels intentional
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const diffColor = diff < 60000 ? "var(--mint)" : diff < 300000 ? "var(--yellow)" : "var(--red)"

  return (
    <>
      <style>{CSS}</style>
      <Confetti />
      <div className="wp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="wp-card">
          <div className="wp-glow" />

          {/* Stars decoration */}
          {[[-12, -12, "22px"], [92, -8, "18px"]].map(([x, y, size], i) => (
            <div key={i} className="star-decoration" style={{
              left: `${x}%`, top: `${y}%`, fontSize: size,
              animationDelay: `${i * 0.1 + 0.3}s`, opacity: 0
            }}>⭐</div>
          ))}

          <button className="wp-close" onClick={onClose}>✕</button>

          {/* Trophy */}
          <span className="wp-trophy">🏆</span>

          <div className="wp-title">🎉 הניחוש המדויק ביותר!</div>

          {/* Winner name */}
          <div className="wp-name">{winner.name}</div>

          {/* Badge */}
          <div className="wp-badge">
            <span style={{ fontSize: "20px" }}>{winner.badge.emoji}</span>
            <span style={{
              padding: "3px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700,
              background: `${winner.badge.color}20`, color: winner.badge.color,
              border: `1px solid ${winner.badge.color}50`
            }}>{winner.badge.label}</span>
            <span style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 700 }}>· {winner.totalWins} ניצחונות</span>
          </div>

          <div className="wp-divider" />

          {/* Stats */}
          <div className="wp-stats">
            <div className="wp-stat">
              <div className="wp-stat-label">ניחוש</div>
              <div className="wp-stat-value" style={{ color: "var(--sky)", fontSize: "13px" }}>{fmtDate(betTs)}</div>
            </div>
            <div className="wp-stat">
              <div className="wp-stat-label">אזעקה</div>
              <div className="wp-stat-value" style={{ color: "var(--yellow)", fontSize: "13px" }}>{fmtDate(alarmAt)}</div>
            </div>
            <div className="wp-stat">
              <div className="wp-stat-label">דיוק</div>
              <div className="wp-stat-value" style={{ color: diffColor }}>{fmtDiff(diff)}</div>
            </div>
          </div>

          {/* Diff bar */}
          <div className="wp-diff-bar">
            <span style={{ fontSize: "28px" }}>🎯</span>
            <div>
              <div style={{ fontSize: "12px", color: "var(--dim)", fontWeight: 700, marginBottom: "2px" }}>הפרש מהאזעקה</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: diffColor }}>{fmtDiff(diff)}</div>
              <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "2px" }}>
                {diff < 60000 ? "🔥 מדהים! דיוק יוצא מן הכלל" : diff < 300000 ? "👏 קרוב מאוד!" : "💪 ניחוש טוב!"}
              </div>
            </div>
          </div>

          {/* CTA button */}
          <button className="wp-btn" onClick={onClose}>
            🚀 המשך לסיבוב הבא!
          </button>
        </div>
      </div>
    </>
  )
}
