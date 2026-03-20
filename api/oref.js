export const config = { runtime: "edge" }

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.oref.org.il/",
  "Origin": "https://www.oref.org.il",
  "X-Requested-With": "XMLHttpRequest",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Cache-Control": "no-store, no-cache, must-revalidate",
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")

  const urls = {
    history: "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json",
    current: "https://www.oref.org.il/WarningMessages/alert/alerts.json",
  }
  const url = urls[type || "history"]
  if (!url) return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: CORS })

  try {
    const response = await fetch(url, { headers: HEADERS })
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Oref returned ${response.status}` }), { status: 502, headers: CORS })
    }
    const text = await response.text()
    return new Response(text || "null", {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
}
