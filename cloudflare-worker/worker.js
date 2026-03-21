const FIREBASE_URL = "https://shelter-bet-default-rtdb.firebaseio.com"
const OREF_CITY    = "גבעתיים"
const OREF_URL     = "https://www.oref.org.il/WarningMessages/alert/alerts.json"
const OREF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json",
}

async function fbGet(path, secret) {
  try {
    const res = await fetch(`${FIREBASE_URL}/${path}.json?auth=${secret}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function fbPut(path, data, secret) {
  try {
    await fetch(`${FIREBASE_URL}/${path}.json?auth=${secret}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  } catch {}
}

async function fbPatch(path, data, secret) {
  try {
    await fetch(`${FIREBASE_URL}/${path}.json?auth=${secret}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  } catch {}
}

async function processAlarm(alarmTs, secret) {
  const current = await fbGet("sb_current", secret)
  if (!current) { await fbPut("sb_last_alarm", alarmTs, secret); await fbPut("sb_pending_alarm", null, secret); return }
  if (!current.open) { await fbPut("sb_pending_alarm", null, secret); return }
  if (alarmTs <= (current.createdAt || 0)) { await fbPut("sb_pending_alarm", null, secret); return }

  const lastAlarm = await fbGet("sb_last_alarm", secret) || 0
  if (alarmTs === lastAlarm) { await fbPut("sb_pending_alarm", null, secret); return }

  const bets = current.bets || {}
  let winner = null, minDiff = Infinity
  for (const [uid, bet] of Object.entries(bets)) {
    const diff = Math.abs((bet.ts || 0) - alarmTs)
    if (diff < minDiff) { minDiff = diff; winner = uid }
  }

  const now = Date.now()
  const doneRound = { ...current, open: false, alarmAt: alarmTs, winnerId: winner, completedAt: now }
  let allRounds = await fbGet("sb_rounds", secret) || []
  if (!Array.isArray(allRounds)) allRounds = Object.values(allRounds)
  allRounds.push(doneRound)

  if (winner) {
    const currentWins = await fbGet(`sb_users/${winner}/totalWins`, secret) || 0
    await fbPatch(`sb_users/${winner}`, { totalWins: currentWins + 1 }, secret)
  }

  const newRound = {
    id: `r${now}`, createdAt: now, open: true, bets: {},
    openedAfterAlarm: true, bettingDeadline: now + 3600000
  }

  await fbPut("sb_rounds",        allRounds, secret)
  await fbPut("sb_current",       newRound,  secret)
  await fbPut("sb_last_alarm",    alarmTs,   secret)
  await fbPut("sb_pending_alarm", null,      secret)

  if (winner && bets[winner]) {
    await fbPut("sb_last_winner", {
      uid: winner, alarmAt: alarmTs,
      betTs: bets[winner].ts, processedAt: now
    }, secret)
  }

  console.log(`Done! Winner: ${winner}, diff: ${Math.round(minDiff / 1000)}s`)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default {
  async scheduled(event, env, ctx) {
    const secret = env.FIREBASE_DB_SECRET
    const githubToken = env.GITHUB_TOKEN

    // Trigger GitHub Actions workflow (which can fetch oref.org.il)
    try {
      const res = await fetch(
        "https://api.github.com/repos/vinipoo/Bomb-Shelter-Game/actions/workflows/poll-oref.yml/dispatches",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${githubToken}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "shelter-bet-poller",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      )
      if (res.status === 204) {
        console.log("GitHub Actions triggered successfully")
      } else {
        console.error("GitHub trigger failed:", res.status, await res.text())
      }
    } catch (e) {
      console.error("GitHub trigger error:", e.message)
    }

    // Also check if there's a pending alarm in Firebase to process
    const pending = await fbGet("sb_pending_alarm", secret)
    if (pending?.ts) {
      console.log(`Found pending alarm ts=${pending.ts}`)
      await processAlarm(pending.ts, secret)
    }

    console.log("Done.")
  },
}
