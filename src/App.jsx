import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts"

/* ═══ STORAGE (localStorage) ═══ */
const getS = async (key) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
const setS = async (key, val) => {
  try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)) } catch { }
}

/* ═══ HELPERS ═══ */
const ADMIN_PW = "1948"
const fmtDate = (ts) => !ts ? "--" : new Date(ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const fmtDiff = (ms) => {
  if (ms == null) return "--"
  const a = Math.abs(ms), h = Math.floor(a / 3600000), m = Math.floor((a % 3600000) / 60000), s = Math.floor((a % 60000) / 1000)
  if (h > 0) return `${h}ש׳ ${m}ד׳`
  if (m > 0) return `${m}ד׳ ${s}שנ׳`
  return `${s} שנ׳`
}
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime() }
const monthStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime() }

const BADGES = [
  { min: 0, label: "חדש במקלט", emoji: "🧸", color: "#94a3b8" },
  { min: 1, label: "בן שכנה", emoji: "☕", color: "#84cc16" },
  { min: 3, label: "מומחה מקלט", emoji: "🎯", color: "#22d3ee" },
  { min: 6, label: "ניחוש אלוף", emoji: "🔮", color: "#a78bfa" },
  { min: 10, label: "נביא גבעתיים", emoji: "⭐", color: "#f59e0b" },
  { min: 15, label: "אורקל מגדל", emoji: "🦄", color: "#f472b6" },
]
const getBadge = (w) => [...BADGES].reverse().find(b => w >= b.min) || BADGES[0]
const getNextBdg = (w) => BADGES.find(b => b.min > w)

function calcLB(rounds, allUsers, scope) {
  const ws = weekStart(), ms = monthStart()
  const filtered = rounds.filter(r => scope === "weekly" ? r.completedAt >= ws : scope === "monthly" ? r.completedAt >= ms : true)
  const data = {}
  for (const r of filtered) {
    for (const [uid, bet] of Object.entries(r.bets || {})) {
      if (!data[uid]) data[uid] = { name: bet.name || allUsers[uid]?.displayName || uid, wins: 0, totalMs: 0, count: 0 }
      data[uid].totalMs += Math.abs(bet.ts - r.alarmAt); data[uid].count++
      if (r.winnerId === uid) data[uid].wins++
    }
  }
  return Object.entries(data)
    .map(([id, d]) => ({ id, ...d, avgMin: d.count ? Math.round(d.totalMs / d.count / 60000) : null }))
    .sort((a, b) => b.wins - a.wins || (a.avgMin ?? 9999) - (b.avgMin ?? 9999))
}

/* ═══ CSS ═══ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700;800;900&display=swap');
  :root {
    --bg:     #0a0e1a;
    --bg2:    #0d1220;
    --card:   rgba(14,20,38,0.82);
    --card2:  rgba(18,26,48,0.9);
    --border: rgba(80,110,180,0.25);
    --sky:    #7ec8e3;
    --mint:   #34d399;
    --yellow: #fbbf24;
    --pink:   #f472b6;
    --purple: #a78bfa;
    --red:    #fb7185;
    --text:   #d0ddf0;
    --dim:    #5a6e90;
    --dim2:   #2e3d58;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html { font-size: 16px; }

  body {
    background: #0a0e1a;
    background-image:
      radial-gradient(ellipse 120px 120px at 72% 8%, rgba(255,255,220,.18) 0%, transparent 70%),
      linear-gradient(158deg, transparent 48%, rgba(255,255,200,.12) 49%, rgba(255,255,200,.06) 50%, transparent 51%),
      linear-gradient(148deg, transparent 52%, rgba(255,240,180,.09) 53%, rgba(255,240,180,.04) 54%, transparent 55%),
      linear-gradient(138deg, transparent 55%, rgba(255,250,200,.07) 56%, rgba(255,250,200,.03) 57%, transparent 58%),
      radial-gradient(ellipse 140% 25% at 50% 100%, rgba(255,140,30,.18) 0%, rgba(255,100,20,.08) 40%, transparent 70%),
      radial-gradient(ellipse 80% 20% at 30% 100%, rgba(255,160,60,.1) 0%, transparent 60%),
      radial-gradient(ellipse 60% 18% at 75% 100%, rgba(255,120,40,.08) 0%, transparent 55%),
      linear-gradient(to bottom,
        #06090f 0%,
        #080d18 15%,
        #0a1020 30%,
        #0c1428 55%,
        #0e1530 75%,
        #111828 100%
      );
    min-height: 100vh;
  }

  @media (max-width: 400px) {
    html { font-size: 14px; }
  }
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:var(--bg)} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
  input[type="datetime-local"]{color-scheme:dark}
  input[type="datetime-local"]::-webkit-calendar-picker-indicator{filter:invert(.5) sepia(1) saturate(3) hue-rotate(180deg);cursor:pointer}

  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes wiggle   { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pop      { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes starTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
  @keyframes bounceIn { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
  @keyframes confetti {
    0%  {transform:translateY(-10px) rotate(0deg);opacity:1}
    100%{transform:translateY(80px) rotate(720deg);opacity:0}
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes glow  { 0%,100%{box-shadow:0 0 8px rgba(56,189,248,.3)} 50%{box-shadow:0 0 22px rgba(56,189,248,.6)} }

  .card {
    background: rgba(10,15,30,0.78);
    border: 1px solid rgba(80,110,180,0.22);
    border-radius: 16px;
    overflow: hidden;
    animation: fadeUp .35s ease both;
    position: relative;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  @media (max-width: 480px) {
    .card { border-radius: 12px; }
  }
  .card-sky    { border-color: rgba(126,200,227,.38); background: rgba(8,22,44,0.80); }
  .card-mint   { border-color: rgba(52,211,153,.38);  background: rgba(6,24,22,0.80); }
  .card-yellow { border-color: rgba(251,191,36,.38);  background: rgba(24,18,4,0.80); }
  .card-pink   { border-color: rgba(244,114,182,.38); background: rgba(26,8,22,0.80); }
  .card-purple { border-color: rgba(167,139,250,.38); background: rgba(16,10,32,0.80); }
  .card-red    { border-color: rgba(251,113,133,.38); background: rgba(26,8,12,0.80); }

  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 12px; border-radius: 999px;
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 700; font-size: 11px;
  }

  .btn {
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 800; font-size: 14px;
    border: none; cursor: pointer; transition: all .18s;
    padding: 11px 22px; border-radius: 12px; position: relative; overflow: hidden;
  }
  .btn:active { transform: scale(.96); }
  .btn-sky    { background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; box-shadow: 0 4px 16px rgba(56,189,248,.35); }
  .btn-sky:hover { box-shadow: 0 6px 22px rgba(56,189,248,.55); transform: translateY(-1px); }
  .btn-mint   { background: linear-gradient(135deg, #059669, #34d399); color: #fff; box-shadow: 0 4px 16px rgba(52,211,153,.35); }
  .btn-mint:hover { box-shadow: 0 6px 22px rgba(52,211,153,.55); transform: translateY(-1px); }
  .btn-yellow { background: linear-gradient(135deg, #d97706, #fbbf24); color: #1a1a00; box-shadow: 0 4px 16px rgba(251,191,36,.35); }
  .btn-yellow:hover { box-shadow: 0 6px 22px rgba(251,191,36,.55); transform: translateY(-1px); }
  .btn-pink   { background: linear-gradient(135deg, #db2777, #f472b6); color: #fff; box-shadow: 0 4px 16px rgba(244,114,182,.35); }
  .btn-pink:hover { box-shadow: 0 6px 22px rgba(244,114,182,.55); transform: translateY(-1px); }
  .btn-ghost  { background: transparent; color: var(--dim); border: 1px solid var(--border); border-radius: 10px; }
  .btn-ghost:hover { color: var(--text); border-color: var(--dim); background: rgba(255,255,255,.04); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none !important; }

  .ifield {
    background: rgba(6,10,20,0.85); border: 2px solid rgba(80,110,180,0.3); color: var(--text);
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 600; font-size: 15px;
    padding: 10px 14px; width: 100%; outline: none;
    border-radius: 12px; transition: border-color .2s, box-shadow .2s;
  }
  .ifield:focus { border-color: var(--sky); box-shadow: 0 0 0 3px rgba(56,189,248,.15); }
  .ifield::placeholder { color: var(--dim); }

  .tab-btn {
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 800; font-size: 12px;
    background: transparent; border: none; border-bottom: 3px solid transparent;
    color: var(--dim); cursor: pointer; padding: 11px 4px;
    transition: all .2s; flex:1;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.act { color: var(--sky); border-bottom-color: var(--sky); }

  @media (max-width: 380px) {
    .tab-btn { font-size: 10px; padding: 10px 2px; }
    .btn { font-size: 13px; padding: 10px 14px; }
    .ifield { font-size: 14px; padding: 9px 12px; }
  }

  .xbar { height: 8px; background: var(--bg2); border-radius: 999px; overflow: hidden; }
  .xbar-fill { height: 100%; border-radius: 999px; transition: width 1.2s ease; }

  .prow {
    display: grid; grid-template-columns: 44px 1fr auto;
    align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid var(--border); transition: background .15s;
  }
  .prow:hover { background: rgba(255,255,255,.02); }
  .prow.me { background: rgba(56,189,248,.05); }
  .prow:last-child { border-bottom: none; }

  .star { position:absolute; border-radius:50%; animation: starTwinkle ease-in-out infinite; }

  .section-title {
    font-family: 'Noto Sans Hebrew', sans-serif; font-size: 13px; letter-spacing: 1px;
    color: var(--dim); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .section-title::after { content:''; flex:1; height:1px; background: linear-gradient(90deg, var(--border), transparent); }

  .winner-pop { animation: bounceIn .5s ease; }
  .float-anim { animation: float 3s ease-in-out infinite; }

  .scope-btn {
    font-family: 'Noto Sans Hebrew', sans-serif; font-weight: 700; font-size: 12px;
    padding: 6px 14px; border-radius: 999px; border: 1.5px solid var(--border);
    background: transparent; color: var(--dim); cursor: pointer; transition: all .18s;
  }
  .scope-btn.act { border-color: var(--sky); color: var(--sky); background: rgba(56,189,248,.1); }
  .scope-btn:hover:not(.act) { color: var(--text); border-color: var(--dim); }
`

/* ═══ STARS BG ═══ */
function Stars() {
  const stars = Array.from({ length: 28 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 1, delay: Math.random() * 4,
    dur: Math.random() * 2 + 2
  }))
  return (
    <>
      {stars.map(s => (
        <div key={s.id} className="star" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          width: `${s.size}px`, height: `${s.size}px`,
          background: s.size > 2.5 ? "var(--yellow)" : "white",
          opacity: .4, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`
        }} />
      ))}
    </>
  )
}

/* ═══ APP ═══ */
export default function ShelterBet() {
  const [page, setPage] = useState("login")
  const [tab, setTab] = useState("bet")
  const [user, setUser] = useState(null)
  const [allUsers, setUsers] = useState({})
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState(null)
  const [loading, setLoading] = useState(true)
  const [winAnim, setWinAnim] = useState(false)

  const [uname, setUname] = useState("")
  const [isReg, setIsReg] = useState(false); const [loginErr, setLoginErr] = useState("")
  const [betDt, setBetDt] = useState(""); const [betMsg, setBetMsg] = useState("")
  const [lbScope, setLbScope] = useState("weekly")
  const [adminPw, setAdminPw] = useState(""); const [adminOk, setAdminOk] = useState(false)
  const [alarmDt, setAlarmDt] = useState(""); const [adminMsg, setAdminMsg] = useState("")
  const [editingUid, setEditingUid] = useState(null); const [editUserName, setEditUserName] = useState("")
  const [editRoundIdx, setEditRoundIdx] = useState(null); const [editRoundDt, setEditRoundDt] = useState("")
  const [adminEntryMode, setAdminEntryMode] = useState(false); const [adminEntryPw, setAdminEntryPw] = useState(""); const [adminEntryErr, setAdminEntryErr] = useState("")
  const [autoDetect, setAutoDetect] = useState(false)
  const [detectedAlarm, setDetectedAlarm] = useState(null)   // { ts, area, title }
  const [orefStatus, setOrefStatus] = useState("idle")  // idle | checking | found | error

  const load = useCallback(async () => {
    try {
      const [u, r, cr, session] = await Promise.all([getS("sb_users"), getS("sb_rounds"), getS("sb_current"), getS("sb_session")])
      const users = u || {}
      setUsers(users); setRounds(r || []); setRound(cr || null)
      if (session?.uid && users[session.uid]) {
        setUser({ id: session.uid, ...users[session.uid] })
        setPage("app")
      }
    } catch { } finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const iv = setInterval(load, 8000); return () => clearInterval(iv) }, [load])

  const doLogin = async () => {
    const uid = uname.trim().toLowerCase().replace(/\s+/g, "_")
    if (!uid) return setLoginErr("איך קוראים לך?")
    const us = await getS("sb_users") || {}
    if (us[uid]) {
      await setS("sb_session", { uid })
      setUser({ id: uid, ...us[uid] }); setUsers(us); setPage("app")
    }
    else { setIsReg(true); setLoginErr("לא מצאנו אותך — הרשם!") }
  }
  const doRegister = async () => {
    const uid = uname.trim().toLowerCase().replace(/\s+/g, "_")
    if (!uid) return setLoginErr("מלא את השם 😊")
    const us = await getS("sb_users") || {}
    if (us[uid]) return setLoginErr("השם הזה תפוס")
    const nu = { displayName: uname.trim(), joinedAt: Date.now(), totalWins: 0 }
    us[uid] = nu; await setS("sb_users", us)
    await setS("sb_session", { uid })
    setUsers(us); setUser({ id: uid, ...nu }); setPage("app")
  }
  const doLogout = async () => {
    await setS("sb_session", null)
    setUser(null); setPage("login"); setUname(""); setIsReg(false); setLoginErr(""); setAdminOk(false)
  }

  const placeBet = async () => {
    if (!betDt) return setBetMsg("בחר תאריך ושעה 🕐")
    if (!round?.open) return setBetMsg("ההימורים סגורים עדיין ⏳")
    const ts = new Date(betDt).getTime()
    if (isNaN(ts)) return setBetMsg("תאריך לא תקין")
    const cr = { ...round, bets: { ...round.bets } }
    cr.bets[user.id] = { ts, placedAt: Date.now(), name: user.displayName }
    await setS("sb_current", cr); setRound(cr)
    setBetMsg("🎉 הימור נשמר!"); setBetDt(""); setTimeout(() => setBetMsg(""), 4000)
  }

  const openRound = async () => {
    const ex = await getS("sb_current")
    if (ex?.open) return setAdminMsg("כבר יש סיבוב פתוח!")
    const nr = { id: `r${Date.now()}`, createdAt: Date.now(), open: true, bets: {} }
    await setS("sb_current", nr); setRound(nr)
    setAdminMsg("✅ סיבוב חדש נפתח! שכנים יכולים להמר"); setTimeout(() => setAdminMsg(""), 5000)
  }

  /* ─── oref auto-detect ─────────────────────────────── */
  const OREF_CITY = "גבעתיים"
  const OREF_HISTORY = "https://www.oref.org.il/WarningMessages/History/AlertsHistory.json"
  const OREF_CURRENT = "https://www.oref.org.il/WarningMessages/alert/alerts.json"

  const recordAlarmAt = useCallback(async (alarmTs) => {
    const cr = await getS("sb_current")
    if (!cr) return setAdminMsg("אין סיבוב פתוח")
    const bets = cr.bets || {}
    let winner = null, minDiff = Infinity
    for (const [uid, bet] of Object.entries(bets)) {
      const d = Math.abs(bet.ts - alarmTs); if (d < minDiff) { minDiff = d; winner = uid }
    }
    const done = { ...cr, open: false, alarmAt: alarmTs, winnerId: winner, completedAt: Date.now() }
    const allR = (await getS("sb_rounds")) || []; allR.push(done)
    const us = (await getS("sb_users")) || {}
    if (winner && us[winner]) us[winner].totalWins = (us[winner].totalWins || 0) + 1
    // Auto-open next round immediately
    const nr = { id: `r${Date.now()}`, createdAt: Date.now(), open: true, bets: {} }
    await Promise.all([setS("sb_rounds", allR), setS("sb_users", us), setS("sb_current", nr)])
    setRounds(allR); setUsers(us); setRound(nr); setAlarmDt("")
    const wName = us[winner]?.displayName || winner || "—"
    setAdminMsg(`🏆 ${wName} ניחש הכי קרוב! הפרש: ${fmtDiff(minDiff)} · סיבוב #${allR.length + 1} נפתח 🚀`)
    setWinAnim(true); setTimeout(() => setWinAnim(false), 2500)
    // Keep auto-detect alive for the next round, just reset the found state
    setDetectedAlarm(null); setOrefStatus("idle")
  }, [])

  const checkOrefAlerts = useCallback(async () => {
    if (!round?.open) return
    setOrefStatus(st => st === "found" ? "found" : "checking")
    const roundStart = round.createdAt || 0
    const hdrs = { "X-Requested-With": "XMLHttpRequest", "Cache-Control": "no-cache" }
    try {
      // 1. Try current live alert
      const curRes = await fetch(OREF_CURRENT, { headers: hdrs, cache: "no-store" })
      if (curRes.ok) {
        const text = (await curRes.text()).replace(/^\uFEFF/, "")
        if (text && text.trim() !== "" && text.trim() !== "null" && text.trim() !== "[]") {
          const obj = JSON.parse(text)
          const areas = Array.isArray(obj?.data) ? obj.data : []
          if (areas.some(a => a.includes(OREF_CITY))) {
            setDetectedAlarm({ ts: Date.now(), area: OREF_CITY, title: obj.title || "אזעקה", live: true })
            setOrefStatus("found"); return
          }
        }
      }
    } catch { }
    try {
      // 2. Try history
      const histRes = await fetch(OREF_HISTORY, { headers: hdrs, cache: "no-store" })
      if (histRes.ok) {
        const text = (await histRes.text()).replace(/^\uFEFF/, "")
        const data = JSON.parse(text) || []
        const relevant = data.filter(a => {
          const ts = new Date(a.alertDate?.replace(" ", "T")).getTime()
          return a.data === OREF_CITY && ts > roundStart
        })
        if (relevant.length > 0) {
          const latest = relevant.sort((a, b) => new Date(b.alertDate) - new Date(a.alertDate))[0]
          const ts = new Date(latest.alertDate.replace(" ", "T")).getTime()
          setDetectedAlarm({ ts, area: OREF_CITY, title: latest.title || "אזעקה" })
          setOrefStatus("found"); return
        }
        setOrefStatus("checking")
      } else { setOrefStatus("error") }
    } catch { setOrefStatus("error") }
  }, [round])

  useEffect(() => {
    if (!autoDetect || !round?.open) return
    checkOrefAlerts()
    const iv = setInterval(checkOrefAlerts, 10000)
    return () => clearInterval(iv)
  }, [autoDetect, round?.open, checkOrefAlerts])

  const recordAlarm = async () => {
    if (!alarmDt) return setAdminMsg("בחר את זמן האזעקה")
    await recordAlarmAt(new Date(alarmDt).getTime())
  }
  const deleteUser = async (uid) => {
    const name = allUsers[uid]?.displayName || uid
    if (!window.confirm(`למחוק את המשתמש "${name}"?`)) return
    const us = { ...allUsers }; delete us[uid]
    const cr = await getS("sb_current")
    if (cr?.bets?.[uid]) { const nb = { ...cr.bets }; delete nb[uid]; const ucr = { ...cr, bets: nb }; await setS("sb_current", ucr); setRound(ucr) }
    await setS("sb_users", us); setUsers(us)
    setAdminMsg(`✅ המשתמש "${name}" נמחק`); setTimeout(() => setAdminMsg(""), 4000)
  }
  const renameUser = async (uid) => {
    const newName = editUserName.trim()
    if (!newName) return
    const us = { ...allUsers, [uid]: { ...allUsers[uid], displayName: newName } }
    const allR = rounds.map(r => r.bets?.[uid] ? { ...r, bets: { ...r.bets, [uid]: { ...r.bets[uid], name: newName } } } : r)
    const cr = await getS("sb_current")
    if (cr?.bets?.[uid]) { const ucr = { ...cr, bets: { ...cr.bets, [uid]: { ...cr.bets[uid], name: newName } } }; await setS("sb_current", ucr); setRound(ucr) }
    await Promise.all([setS("sb_users", us), setS("sb_rounds", allR)])
    setUsers(us); setRounds(allR); setEditingUid(null); setEditUserName("")
    if (user?.id === uid) setUser(u => ({ ...u, displayName: newName }))
    setAdminMsg(`✅ שם עודכן ל-"${newName}"`); setTimeout(() => setAdminMsg(""), 4000)
  }
  const editRound = async (idx) => {
    if (!editRoundDt) return
    const alarmTs = new Date(editRoundDt).getTime()
    if (isNaN(alarmTs)) return
    const allR = [...rounds]; const r = { ...allR[idx] }
    let winner = null, minDiff = Infinity
    for (const [uid, bet] of Object.entries(r.bets || {})) { const d = Math.abs(bet.ts - alarmTs); if (d < minDiff) { minDiff = d; winner = uid } }
    const us = { ...allUsers }
    if (r.winnerId && us[r.winnerId]) us[r.winnerId].totalWins = Math.max(0, (us[r.winnerId].totalWins || 0) - 1)
    if (winner && us[winner]) us[winner].totalWins = (us[winner].totalWins || 0) + 1
    allR[idx] = { ...r, alarmAt: alarmTs, winnerId: winner }
    await Promise.all([setS("sb_rounds", allR), setS("sb_users", us)])
    setRounds(allR); setUsers(us); setEditRoundIdx(null); setEditRoundDt("")
    setAdminMsg(`✅ סיבוב #${idx + 1} עודכן — זוכה: ${us[winner]?.displayName || winner || "—"}`)
    setTimeout(() => setAdminMsg(""), 5000)
  }
  const doAdminFromLogin = async () => {
    if (adminEntryPw !== ADMIN_PW) return setAdminEntryErr("סיסמה שגויה 🙈")
    const us = await getS("sb_users") || {}
    const adminId = "__admin__"
    if (!us[adminId]) { us[adminId] = { displayName: "מנהל", joinedAt: Date.now(), totalWins: 0, isAdmin: true }; await setS("sb_users", us) }
    await setS("sb_session", { uid: adminId })
    setUsers(us); setUser({ id: adminId, ...us[adminId] }); setAdminOk(true); setTab("admin"); setPage("app")
  }

  const myBet = round?.bets?.[user?.id]
  const lastR = rounds[rounds.length - 1]
  const lb = calcLB(rounds, allUsers, lbScope)
  const lbAll = calcLB(rounds, allUsers, "all")
  const myWins = allUsers[user?.id]?.totalWins || 0
  const myBadge = getBadge(myWins)
  const nextB = getNextBdg(myWins)
  const xpPct = nextB ? ((myWins - myBadge.min) / (nextB.min - myBadge.min)) * 100 : 100
  const chartData = rounds.slice(-10).map((r, i) => ({
    name: `#${Math.max(1, rounds.length - 10) + i + 1}`,
    "שכנים": Object.keys(r.bets || {}).length,
    "הפרש (ד׳)": r.winnerId ? Math.round(Math.abs((r.bets[r.winnerId]?.ts || 0) - r.alarmAt) / 60000) : 0
  }))
  const avgPart = rounds.length ? Math.round(rounds.reduce((s, r) => s + Object.keys(r.bets || {}).length, 0) / rounds.length) : 0

  const tabs = [{ id: "bet", e: "🎯", l: "הימור" }, { id: "board", e: "🏆", l: "טבלה" }, { id: "stats", e: "📊", l: "סטטיסטיקה" }, { id: "admin", e: "⚙️", l: "ניהול" }]

  /* LOADING */
  if (loading) return (
    <div style={{ background: "transparent", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", fontFamily: "'Noto Sans Hebrew',sans-serif", direction: "rtl", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Stars />
      <div style={{ fontSize: "48px", animation: "float 2s ease-in-out infinite" }}>🏠</div>
      <div style={{ color: "var(--dim)", fontSize: "14px", fontWeight: 700 }}>מחפשים שכנים...</div>
    </div>
  )

  /* LOGIN */
  if (page === "login") return (
    <div style={{ background: "transparent", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,5vw,32px)", fontFamily: "'Noto Sans Hebrew',sans-serif", direction: "rtl", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>
      <Stars />
      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "70px", animation: "float 3s ease-in-out infinite", display: "block", lineHeight: 1, marginBottom: "12px" }}>🏠</div>
          <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "36px", background: "linear-gradient(135deg,var(--sky),var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "1px" }}>
            מי ינחש?
          </div>
          <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginTop: "6px" }}>
            הימורים בין שכנים 🌙 גבעתיים
          </div>
          <div style={{ color: "var(--text)", fontSize: "15px", fontWeight: 700, marginTop: "8px", opacity: 0.85 }}>
            יאללה, תנחשו – מתי האזעקה הבאה?
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "10px" }}>
            <span style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 700 }}>👥 {Object.keys(allUsers).length} שכנים</span>
            <span style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 700 }}>🎲 {rounds.length} סיבובים</span>
          </div>
        </div>

        <div className="card card-sky" style={{ padding: "24px" }}>
          <div className="section-title">כניסה לבניין</div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px", textTransform: "uppercase" }}>שם משתמש</div>
            <input className="ifield" value={uname} onChange={e => { setUname(e.target.value); setLoginErr(""); setIsReg(false) }}
              onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="הכנס שם משתמש..." />
          </div>
          {isReg && (
            <div style={{ color: "var(--mint)", fontSize: "13px", fontWeight: 700, marginBottom: "12px", padding: "10px", background: "rgba(52,211,153,.08)", borderRadius: "10px", animation: "fadeUp .2s ease" }}>
              👋 שכן חדש! לחץ על "הצטרף" כדי להירשם עם השם הזה
            </div>
          )}
          {loginErr && <div style={{ color: "var(--red)", fontSize: "13px", fontWeight: 700, textAlign: "center", margin: "8px 0", animation: "pop .2s ease" }}>{loginErr}</div>}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            {!isReg
              ? <><button className="btn btn-sky" style={{ flex: 1 }} onClick={doLogin}>כניסה 👋</button>
                <button className="btn btn-ghost" onClick={() => { setIsReg(true); setLoginErr("") }}>הרשמה</button></>
              : <><button className="btn btn-ghost" onClick={() => { setIsReg(false); setLoginErr("") }}>← חזרה</button>
                <button className="btn btn-mint" style={{ flex: 1 }} onClick={doRegister}>הצטרף לבניין! 🏠</button></>

            }
          </div>
        </div>

        {/* ── Admin shortcut ── */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          {!adminEntryMode
            ? <button className="btn btn-ghost" style={{ fontSize: "12px", padding: "6px 18px" }} onClick={() => { setAdminEntryMode(true); setAdminEntryErr(""); setAdminEntryPw("") }}>
              ⚙️ כניסת מנהל
            </button>
            : <div className="card card-purple" style={{ padding: "18px", animation: "fadeUp .25s ease" }}>
              <div style={{ color: "var(--purple)", fontWeight: 800, fontSize: "14px", marginBottom: "10px" }}>🔑 כניסת מנהל</div>
              <input type="password" className="ifield" value={adminEntryPw}
                onChange={e => { setAdminEntryPw(e.target.value); setAdminEntryErr("") }}
                onKeyDown={e => e.key === "Enter" && doAdminFromLogin()}
                placeholder="סיסמת מנהל..." style={{ marginBottom: "10px" }} />
              {adminEntryErr && <div style={{ color: "var(--red)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>{adminEntryErr}</div>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-ghost" style={{ fontSize: "12px", padding: "7px 14px" }} onClick={() => { setAdminEntryMode(false); setAdminEntryPw(""); setAdminEntryErr("") }}>
                  ביטול
                </button>
                <button className="btn" style={{ flex: 1, background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", boxShadow: "0 4px 16px rgba(167,139,250,.35)", fontSize: "13px" }} onClick={doAdminFromLogin}>
                  כניסה ⚙️
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  )

  /* MAIN APP */
  return (
    <div style={{ background: "transparent", minHeight: "100vh", fontFamily: "'Noto Sans Hebrew',sans-serif", color: "var(--text)", direction: "rtl", position: "relative" }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{ background: "rgba(8,12,24,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(80,110,180,0.2)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "10px clamp(10px,4vw,20px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "18px", background: "linear-gradient(135deg,var(--sky),var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>מי ינחש?</span>
            {round?.open && (
              <span className="pill" style={{ background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", color: "var(--mint)" }}>
                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--mint)", animation: "pulse 1.5s ease infinite" }} />
                פתוח
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "14px" }}>{myBadge.emoji}</span>
                <span style={{ fontWeight: 800, fontSize: "13px" }}>{user?.displayName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                <div className="xbar" style={{ width: "60px" }}>
                  <div className="xbar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${myBadge.color}88,${myBadge.color})` }} />
                </div>
                <span style={{ color: "var(--dim)", fontSize: "10px", fontWeight: 700 }}>{myWins} ניצ׳</span>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "12px" }} onClick={doLogout}>יציאה</button>
          </div>
        </div>
        <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", borderTop: "1px solid var(--border)" }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " act" : ""}`} onClick={() => setTab(t.id)}>
              {t.e} {t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px clamp(10px, 4vw, 20px)", maxWidth: "600px", margin: "0 auto" }}>

        {/* ══ BET TAB ══ */}
        {tab === "bet" && (
          <div>
            {round?.open ? (
              <div className="card card-mint" style={{ padding: "16px 18px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "20px", color: "var(--mint)" }}>🎯 סיבוב #{rounds.length + 1} פתוח!</div>
                    <div style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 700, marginTop: "2px" }}>{Object.keys(round.bets || {}).length} שכנים הגישו הימור</div>
                  </div>
                  <div style={{ fontSize: "32px", animation: "float 2.5s ease-in-out infinite" }}>🚀</div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: "16px 18px", marginBottom: "14px", borderColor: "rgba(251,113,133,.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "30px", animation: "float 2s ease-in-out infinite" }}>⏳</span>
                  <div>
                    <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "16px", color: "var(--red)" }}>ממתינים לסיבוב הבא</div>
                    <div style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 600 }}>המנהל יפתח הימורים לאחר האזעקה הבאה</div>
                  </div>
                </div>
              </div>
            )}

            {lastR && (
              <div className={`card card-yellow${winAnim ? " winner-pop" : ""}`} style={{ padding: "16px 18px", marginBottom: "14px" }}>
                <div className="section-title">⭐ תוצאת הסיבוב האחרון</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "24px" }}>🏆</span>
                      <span style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "22px", color: "var(--yellow)" }}>{lastR.bets[lastR.winnerId]?.name || lastR.winnerId}</span>
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div>
                        <div style={{ color: "var(--dim)", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>הפרש</div>
                        <div style={{ color: "var(--mint)", fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "18px" }}>{fmtDiff(Math.abs((lastR.bets[lastR.winnerId]?.ts || 0) - lastR.alarmAt))}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--dim)", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>שכנים</div>
                        <div style={{ color: "var(--text)", fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "18px" }}>{Object.keys(lastR.bets).length}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 14px", background: "rgba(0,0,0,.2)", borderRadius: "12px" }}>
                    <div style={{ color: "var(--dim)", fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>האזעקה הייתה</div>
                    <div style={{ color: "var(--yellow)", fontWeight: 800, fontSize: "13px" }}>{fmtDate(lastR.alarmAt)}</div>
                  </div>
                </div>
              </div>
            )}

            {round?.open && (
              <div className={`card${myBet ? " card-sky" : ""}`} style={{ padding: "16px 18px", marginBottom: "14px" }}>
                <div className="section-title">{myBet ? "✅ ההימור שלי" : "🎯 הגש הימור"}</div>
                {myBet && (
                  <div style={{ marginBottom: "14px", textAlign: "center", padding: "10px", background: "rgba(56,189,248,.08)", borderRadius: "12px" }}>
                    <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, marginBottom: "4px" }}>ניחשת:</div>
                    <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "26px", color: "var(--sky)" }}>⏰ {fmtDate(myBet.ts)}</div>
                    <div style={{ color: "var(--dim)", fontSize: "11px", marginTop: "4px" }}>הוגש {fmtDate(myBet.placedAt)}</div>
                  </div>
                )}
                {!myBet && <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>מתי לדעתך תהיה האזעקה הבאה? 🤔</div>}
                <input type="datetime-local" className="ifield" value={betDt} onChange={e => setBetDt(e.target.value)} style={{ marginBottom: "10px" }} />
                <button className="btn btn-sky" style={{ width: "100%" }} onClick={placeBet}>
                  {myBet ? "🔄 עדכן הימור" : "🎯 נעל הימור!"}
                </button>
                {betMsg && <div style={{ color: betMsg.startsWith("🎉") ? "var(--mint)" : "var(--red)", fontSize: "14px", fontWeight: 700, textAlign: "center", marginTop: "10px", animation: "pop .3s ease" }}>{betMsg}</div>}
              </div>
            )}

            {round?.open && Object.keys(round.bets || {}).length > 0 && (
              <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px 8px" }}>
                  <div className="section-title">👀 ההימורים של כולם</div>
                </div>
                {Object.entries(round.bets).sort((a, b) => a[1].ts - b[1].ts).map(([uid, bet]) => {
                  const bdg = getBadge(allUsers[uid]?.totalWins || 0)
                  return (
                    <div key={uid} className={`prow${uid === user.id ? " me" : ""}`}>
                      <div style={{ textAlign: "center", fontSize: "20px" }}>{bdg.emoji}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: uid === user.id ? "var(--sky)" : "var(--text)" }}>{bet.name}{uid === user.id ? " (אני)" : ""}</div>
                        <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600 }}>{bdg.label}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "13px", color: uid === user.id ? "var(--sky)" : "var(--dim)" }}>{fmtDate(bet.ts)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD TAB ══ */}
        {tab === "board" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[["weekly", "שבוע"], ["monthly", "חודש"], ["all", "כל הזמן"]].map(([s, l]) => (
                <button key={s} className={`scope-btn${lbScope === s ? " act" : ""}`} onClick={() => setLbScope(s)}>{l}</button>
              ))}
            </div>
            {lb.length === 0
              ? <div style={{ textAlign: "center", padding: "50px 0", color: "var(--dim)" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🤷</div>
                <div style={{ fontWeight: 700 }}>אין נתונים לתקופה זו</div>
              </div>
              : lb.map((p, i) => {
                const isMe = p.id === user?.id
                const bdg = getBadge(allUsers[p.id]?.totalWins || 0)
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
                const mc = i === 0 ? "var(--yellow)" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--dim)"
                return (
                  <div key={p.id} className={`card${i === 0 ? " card-yellow" : i < 3 ? " card-sky" : ""}`}
                    style={{ padding: "14px 16px", marginBottom: "10px", display: "grid", gridTemplateColumns: "50px 1fr auto", gap: "12px", alignItems: "center", animationDelay: `${i * .06}s` }}>
                    <div style={{ textAlign: "center" }}>
                      {medal ? <span style={{ fontSize: "28px" }}>{medal}</span>
                        : <span style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "20px", color: mc }}>#{i + 1}</span>}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "16px" }}>{bdg.emoji}</span>
                        <span style={{ fontWeight: 800, fontSize: "15px", color: isMe ? "var(--sky)" : "var(--text)" }}>{p.name}{isMe ? " ← אני" : ""}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="pill" style={{ background: `${bdg.color}18`, color: bdg.color, border: `1px solid ${bdg.color}40`, fontSize: "10px" }}>{bdg.label}</span>
                        <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600 }}>±{p.avgMin ?? '--'}ד׳ | {p.count || 0} הימורים</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "30px", color: mc, lineHeight: 1 }}>{p.wins}</div>
                      <div style={{ color: "var(--dim)", fontSize: "10px", fontWeight: 700 }}>ניצחונות</div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ══ STATS TAB ══ */}
        {tab === "stats" && (
          <div>
            {rounds.length === 0
              ? <div style={{ textAlign: "center", padding: "50px 0", color: "var(--dim)" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📡</div>
                <div style={{ fontWeight: 700 }}>אין נתונים עדיין</div>
              </div>
              : <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                  {[
                    ["🎲", rounds.length, "סיבובים"],
                    ["👥", avgPart, "ממוצע משתתפים"],
                    ["🏆", lbAll[0]?.name || "—", "מוביל הבניין"],
                    ["⭐", lbAll[0]?.wins || 0, "ניצחונות מובייל"],
                  ].map(([e, v, l], i) => (
                    <div key={i} className="card" style={{ padding: "16px", textAlign: "center", animationDelay: `${i * .07}s` }}>
                      <div style={{ fontSize: "26px", marginBottom: "6px" }}>{e}</div>
                      <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "22px", color: "var(--sky)" }}>{v}</div>
                      <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                  <div className="section-title">👥 שכנים לסיבוב</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Noto Sans Hebrew", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Noto Sans Hebrew", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "12px", fontFamily: "Noto Sans Hebrew", borderRadius: "10px" }} cursor={{ fill: "rgba(56,189,248,.05)" }} />
                      <Bar dataKey="שכנים" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill="url(#barGrad)" opacity={.6 + i / chartData.length * .4} />)}
                      </Bar>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                  <div className="section-title">🎯 דיוק הזוכה (דקות)</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData} margin={{ top: 0, right: 10, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Noto Sans Hebrew", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Noto Sans Hebrew", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "12px", fontFamily: "Noto Sans Hebrew", borderRadius: "10px" }} cursor={{ stroke: "var(--border)" }} />
                      <Line type="monotone" dataKey="הפרש (ד׳)" stroke="var(--mint)" strokeWidth={2.5} dot={{ fill: "var(--mint)", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px 8px" }}><div className="section-title">📋 טבלה מלאה</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 55px 60px", padding: "8px 16px", fontSize: "10px", color: "var(--dim)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
                    <span>#</span><span>שכן</span><span style={{ textAlign: "center" }}>ניצח</span><span style={{ textAlign: "center" }}>±ד׳</span>
                  </div>
                  {lbAll.map((p, i) => {
                    const bdg = getBadge(allUsers[p.id]?.totalWins || 0)
                    return (
                      <div key={p.id} className={`prow${p.id === user?.id ? " me" : ""}`} style={{ gridTemplateColumns: "32px 1fr 55px 60px", padding: "10px 16px" }}>
                        <span style={{ color: i < 3 ? "var(--yellow)" : "var(--dim)", fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "15px" }}>{i + 1}</span>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: p.id === user?.id ? "var(--sky)" : "var(--text)" }}>{bdg.emoji} {p.name}</span>
                        <span style={{ textAlign: "center", color: "var(--yellow)", fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "16px" }}>{p.wins}</span>
                        <span style={{ textAlign: "center", color: "var(--dim)", fontSize: "12px", fontWeight: 700 }}>±{p.avgMin ?? '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            }
          </div>
        )}

        {/* ══ ADMIN TAB ══ */}
        {tab === "admin" && (
          <div>
            {!adminOk
              ? <div className="card card-purple" style={{ padding: "28px 22px", marginTop: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "50px", marginBottom: "12px", animation: "float 2.5s ease-in-out infinite" }}>🔑</div>
                <div style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "22px", color: "var(--purple)", marginBottom: "4px" }}>כניסה לניהול</div>
                <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginBottom: "20px" }}>רק מנהל הבניין יכול להיכנס</div>
                <input type="password" className="ifield" value={adminPw}
                  onChange={e => { setAdminPw(e.target.value); setAdminMsg("") }}
                  onKeyDown={e => e.key === "Enter" && (adminPw === ADMIN_PW ? setAdminOk(true) : setAdminMsg("סיסמה שגויה 🙈"))}
                  placeholder="סיסמת מנהל..." style={{ marginBottom: "12px", textAlign: "center" }} />
                <button className="btn" style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff", boxShadow: "0 4px 16px rgba(167,139,250,.35)" }}
                  onClick={() => adminPw === ADMIN_PW ? setAdminOk(true) : setAdminMsg("סיסמה שגויה 🙈")}>
                  כניסה
                </button>
                {adminMsg && <div style={{ color: "var(--red)", fontSize: "13px", fontWeight: 700, marginTop: "10px" }}>{adminMsg}</div>}
              </div>
              : <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", fontSize: "16px", color: "var(--purple)" }}>🔓 מצב מנהל</span>
                  <button className="btn btn-ghost" style={{ padding: "5px 14px", fontSize: "12px" }} onClick={() => setAdminOk(false)}>נעל</button>
                </div>

                <div className="card card-mint" style={{ padding: "18px", marginBottom: "14px" }}>
                  <div className="section-title">🚀 פתיחת סיבוב הימורים</div>
                  <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginBottom: "14px" }}>
                    {round?.open
                      ? `✅ סיבוב #${rounds.length + 1} פתוח — ${Object.keys(round.bets || {}).length} שכנים הגישו הימור`
                      : "פתח סיבוב חדש כדי שהשכנים יוכלו להמר על האזעקה הבאה"
                    }
                  </div>
                  <button className="btn btn-mint" style={{ width: "100%" }} onClick={openRound} disabled={round?.open}>
                    {round?.open ? "הסיבוב פתוח ✓" : "📣 פתח סיבוב הימורים!"}
                  </button>
                </div>

                <div className="card card-red" style={{ padding: "18px", marginBottom: "14px" }}>
                  <div className="section-title">🚨 רישום האזעקה</div>

                  {/* ─── AUTO DETECT PANEL ─── */}
                  <div style={{ marginBottom: "16px", padding: "14px", background: "rgba(0,0,0,.25)", borderRadius: "12px", border: "1px solid rgba(251,113,133,.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: autoDetect ? "12px" : "0" }}>
                      <div>
                        <span style={{ color: "var(--sky)", fontWeight: 800, fontSize: "13px" }}>🟥 זיהוי אוטומטי — פיקוד העורף</span>
                        {!autoDetect && <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600, marginTop: "2px" }}>מזהה אזעקות לגבעתיים אוטומטית</div>}
                      </div>
                      <button
                        className={`btn ${autoDetect ? "btn-pink" : "btn-sky"}`}
                        style={{ padding: "7px 18px", fontSize: "12px" }}
                        onClick={() => { setAutoDetect(a => !a); setDetectedAlarm(null); setOrefStatus("idle") }}
                        disabled={!round?.open}
                      >
                        {autoDetect ? "⏹ עצור" : "▶ הפעל"}
                      </button>
                    </div>

                    {autoDetect && (
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>
                        {orefStatus === "idle" && (
                          <div style={{ color: "var(--dim)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--dim)", animation: "pulse 1.5s infinite" }} />
                            מחפש אזעקות...
                          </div>
                        )}
                        {orefStatus === "checking" && (
                          <div style={{ color: "var(--dim)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--mint)", animation: "pulse 1s infinite" }} />
                            🔍 בדיקה פעילה... לא זוהתה אזעקה לגבעתיים
                          </div>
                        )}
                        {orefStatus === "error" && (
                          <div style={{ color: "var(--yellow)", display: "flex", alignItems: "center", gap: "8px" }}>
                            ⚠️ לא ניתן להתחבר ל-API של פיקוד העורף. הזן זמן ידנית.
                          </div>
                        )}
                        {orefStatus === "found" && detectedAlarm && (
                          <div style={{ animation: "bounceIn .4s ease" }}>
                            <div style={{ color: "var(--mint)", marginBottom: "10px", fontSize: "14px", fontWeight: 800 }}>
                              ✅ זוהתה אזעקה בגבעתיים!
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "rgba(52,211,153,.08)", borderRadius: "10px", marginBottom: "10px" }}>
                              <span style={{ fontSize: "24px" }}>{detectedAlarm.live ? "🔴" : "🕛"}</span>
                              <div>
                                <div style={{ color: "var(--mint)", fontWeight: 800 }}>{detectedAlarm.title}</div>
                                <div style={{ color: "var(--sky)", fontSize: "16px", fontWeight: 800 }}>{fmtDate(detectedAlarm.ts)}</div>
                                {detectedAlarm.live && <div style={{ color: "var(--yellow)", fontSize: "11px", fontWeight: 700 }}>⚡ אזעקה חיה כרגע!</div>}
                              </div>
                            </div>
                            <button className="btn btn-pink" style={{ width: "100%", fontSize: "15px", padding: "13px" }}
                              onClick={() => recordAlarmAt(detectedAlarm.ts)}>
                              🚨 אשר אזעקה — הכרז זוכה!
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>או הזן זמן ידנית:</div>
                  <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginBottom: "14px" }}>
                    {round?.open
                      ? `${Object.keys(round.bets || {}).length} שכנים ממתינים לתוצאה`
                      : "בחר את השעה המדויקת של האזעקה האחרונה"
                    }
                  </div>
                  <input type="datetime-local" className="ifield" value={alarmDt}
                    onChange={e => setAlarmDt(e.target.value)} style={{ marginBottom: "12px" }} />
                  <button className="btn btn-pink" style={{ width: "100%" }} onClick={recordAlarm}>
                    🚨 אשר אזעקה — הכרז זוכה!
                  </button>
                  {adminMsg && (
                    <div style={{
                      color: adminMsg.includes("🏆") ? "var(--yellow)" : adminMsg.startsWith("✅") ? "var(--mint)" : "var(--red)",
                      fontSize: "15px", fontWeight: 800, textAlign: "center", marginTop: "14px",
                      padding: "12px", background: "rgba(0,0,0,.2)", borderRadius: "12px",
                      animation: "pop .4s ease"
                    }}>{adminMsg}</div>
                  )}
                </div>

                <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px 8px" }}><div className="section-title">📜 היסטוריה ({rounds.length})</div></div>
                  {rounds.length === 0
                    ? <div style={{ textAlign: "center", padding: "20px", color: "var(--dim)", fontWeight: 700 }}>עדיין לא היו סיבובים</div>
                    : rounds.slice().reverse().slice(0, 12).map((r, i) => (
                      <div key={r.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontFamily: "'Noto Sans Hebrew',sans-serif", color: "var(--sky)", fontSize: "14px" }}>סיבוב #{rounds.length - i}</span>
                          <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600 }}>{fmtDate(r.completedAt)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--yellow)", fontWeight: 700, fontSize: "13px" }}>🏆 {r.bets[r.winnerId]?.name || r.winnerId}</span>
                          <span style={{ color: "var(--dim)", fontSize: "12px", fontWeight: 600 }}>±{fmtDiff(Math.abs((r.bets[r.winnerId]?.ts || 0) - r.alarmAt))} · {Object.keys(r.bets).length} שכנים</span>
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* ── Users Management ── */}
                <div className="card" style={{ padding: "0", overflow: "hidden", marginTop: "14px" }}>
                  <div style={{ padding: "14px 18px 8px" }}><div className="section-title">👥 ניהול משתמשים ({Object.keys(allUsers).filter(k => k !== "__admin__").length})</div></div>
                  {Object.entries(allUsers).filter(([k]) => k !== "__admin__").length === 0
                    ? <div style={{ textAlign: "center", padding: "20px", color: "var(--dim)", fontWeight: 700 }}>אין משתמשים</div>
                    : Object.entries(allUsers).filter(([k]) => k !== "__admin__").map(([uid, u]) => (
                      <div key={uid} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                        {editingUid === uid
                          ? <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input className="ifield" value={editUserName} autoFocus
                              onChange={e => setEditUserName(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && renameUser(uid)}
                              style={{ fontSize: "13px", padding: "7px 12px" }} />
                            <button className="btn btn-mint" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => renameUser(uid)}>✓</button>
                            <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: "12px" }} onClick={() => { setEditingUid(null); setEditUserName("") }}>✕</button>
                          </div>
                          : <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>{getBadge(u.totalWins || 0).emoji} {u.displayName}</span>
                              <span style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600 }}> · {u.totalWins || 0} ניצ׳</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "11px" }} onClick={() => { setEditingUid(uid); setEditUserName(u.displayName) }}>✏️ שנה שם</button>
                              <button className="btn" style={{ padding: "5px 10px", fontSize: "11px", background: "linear-gradient(135deg,#991b1b,#fb7185)", color: "#fff" }} onClick={() => deleteUser(uid)}>🗑️</button>
                            </div>
                          </div>
                        }
                      </div>
                    ))
                  }
                </div>

                {/* ── Reset History ── */}
                <div className="card card-red" style={{ padding: "18px", marginTop: "14px" }}>
                  <div className="section-title">🗑️ איפוס היסטוריה</div>
                  <div style={{ color: "var(--dim)", fontSize: "13px", fontWeight: 600, marginBottom: "14px" }}>
                    מוחק את כל הסיבובים ומאפס ניצחונות לכל השכנים. לא ניתן לבטל!
                  </div>
                  <button className="btn" style={{ width: "100%", background: "linear-gradient(135deg,#7f1d1d,#fb7185)", color: "#fff", boxShadow: "0 4px 16px rgba(251,113,133,.3)" }}
                    onClick={async () => {
                      if (!window.confirm("בטוח? פעולה זו תמחק את כל ההיסטוריה ותאפס ניצחונות לכולם!")) return
                      const us = { ...allUsers }
                      Object.keys(us).forEach(uid => { us[uid] = { ...us[uid], totalWins: 0 } })
                      await Promise.all([setS("sb_rounds", []), setS("sb_users", us), setS("sb_current", null)])
                      setRounds([]); setUsers(us); setRound(null)
                      setAdminMsg("✅ ההיסטוריה אופסה בהצלחה"); setTimeout(() => setAdminMsg(""), 4000)
                    }}>
                    🗑️ אפס הכל
                  </button>
                </div>

                {/* ── Round Editing ── */}
                <div className="card" style={{ padding: "0", overflow: "hidden", marginTop: "14px", marginBottom: "14px" }}>
                  <div style={{ padding: "14px 18px 8px" }}><div className="section-title">✏️ עריכת סיבובים</div></div>
                  {rounds.length === 0
                    ? <div style={{ textAlign: "center", padding: "20px", color: "var(--dim)", fontWeight: 700 }}>אין סיבובים לעריכה</div>
                    : rounds.slice().reverse().slice(0, 10).map((r, i) => {
                      const realIdx = rounds.length - 1 - i
                      return (
                        <div key={r.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editRoundIdx === realIdx ? "10px" : "0" }}>
                            <div>
                              <span style={{ color: "var(--sky)", fontWeight: 700, fontSize: "13px" }}>סיבוב #{realIdx + 1}</span>
                              <span style={{ color: "var(--yellow)", fontSize: "12px", fontWeight: 600 }}> · 🏆 {r.bets[r.winnerId]?.name || r.winnerId || "—"}</span>
                              <div style={{ color: "var(--dim)", fontSize: "11px", fontWeight: 600, marginTop: "2px" }}>⏰ {fmtDate(r.alarmAt)}</div>
                            </div>
                            {editRoundIdx === realIdx
                              ? <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "11px" }} onClick={() => { setEditRoundIdx(null); setEditRoundDt("") }}>✕ בטל</button>
                              : <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "11px" }} onClick={() => { setEditRoundIdx(realIdx); setEditRoundDt("") }}>✏️ ערוך</button>
                            }
                          </div>
                          {editRoundIdx === realIdx && (
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <input type="datetime-local" className="ifield" value={editRoundDt}
                                onChange={e => setEditRoundDt(e.target.value)}
                                style={{ fontSize: "13px", padding: "7px 12px" }} />
                              <button className="btn btn-sky" style={{ padding: "7px 14px", fontSize: "12px", whiteSpace: "nowrap" }} onClick={() => editRound(realIdx)}>✓ עדכן</button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  }
                </div>

              </div>
            }
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "20px 16px", color: "var(--dim)", fontSize: "12px", fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: "10px" }}>
        🏠 בניין גבעתיים · {round?.open ? `סיבוב #${rounds.length + 1} פתוח 🟢` : "ממתינים לאזעקה 🔴"} · מתעדכן כל 8 שניות
      </div>
    </div>
  )
}
