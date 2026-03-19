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
      headers: { "X-Requested-With": "XMLHttpRequest", "Referer": "https://www.oref.org.il/" },
    })
    const text = await response.text()
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.send(text)
  } catch {
    res.status(500).json({ error: "Failed to fetch from Oref" })
  }
}
