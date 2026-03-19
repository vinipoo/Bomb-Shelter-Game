export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET")

  const { type } = req.query
  const urls = {
    history: "https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json",
    current: "https://www.oref.org.il/WarningMessages/alert/alerts.json",
  }
  const url = urls[type || "history"]
  if (!url) return res.status(400).json({ error: "Invalid type" })

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.oref.org.il/",
        "Origin": "https://www.oref.org.il",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
    const text = await response.text()
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.send(text)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from Oref" })
  }
}
