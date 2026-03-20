export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate")

  const { type } = req.query
  const urls = {
    history: "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json",
    current: "https://www.oref.org.il/WarningMessages/alert/alerts.json",
  }
  const url = urls[type || "history"]
  if (!url) return res.status(400).json({ error: "Invalid type" })

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
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

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(url, { headers: HEADERS, signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      return res.status(502).json({ error: `Oref returned ${response.status}` })
    }

    const text = await response.text()
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.send(text || "null")
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Oref request timed out" })
    }
    res.status(500).json({ error: "Failed to fetch from Oref", detail: err.message })
  }
}
