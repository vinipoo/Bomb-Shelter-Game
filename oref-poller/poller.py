"""
Oref Alert Poller — runs locally on your PC (residential IP, never blocked)
Polls oref.org.il every 2 seconds and writes to Firebase when alarm fires in גבעתיים.

Usage:
  pip install requests
  python poller.py
"""

import json
import os
import time
import requests

FIREBASE_URL = "https://shelter-bet-default-rtdb.firebaseio.com"
SECRET       = os.environ.get("FIREBASE_DB_SECRET", "")
OREF_CITY    = "גבעתיים"
OREF_URL     = "https://www.oref.org.il/WarningMessages/alert/alerts.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.oref.org.il/",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json",
}

if not SECRET:
    print("ERROR: Set FIREBASE_DB_SECRET environment variable first.")
    print("  Windows: set FIREBASE_DB_SECRET=your-secret-here")
    exit(1)


def fb_put(path, data):
    try:
        requests.put(
            f"{FIREBASE_URL}/{path}.json?auth={SECRET}",
            json=data, timeout=10
        )
    except Exception as e:
        print(f"Firebase error: {e}")


def fb_get(path):
    try:
        r = requests.get(f"{FIREBASE_URL}/{path}.json?auth={SECRET}", timeout=10)
        return r.json()
    except Exception as e:
        print(f"Firebase get error: {e}")
        return None


def fb_patch(path, data):
    try:
        requests.patch(
            f"{FIREBASE_URL}/{path}.json?auth={SECRET}",
            json=data, timeout=10
        )
    except Exception as e:
        print(f"Firebase patch error: {e}")


def process_alarm(alarm_ts):
    current = fb_get("sb_current")
    if not current:
        print("No current round — skipping")
        fb_put("sb_last_alarm", alarm_ts)
        fb_put("sb_pending_alarm", None)
        return
    if not current.get("open"):
        print("Round already closed — skipping")
        fb_put("sb_pending_alarm", None)
        return
    if alarm_ts <= current.get("createdAt", 0):
        print("Alarm older than round — skipping")
        fb_put("sb_pending_alarm", None)
        return
    last_alarm = fb_get("sb_last_alarm") or 0
    if alarm_ts == last_alarm:
        print("Alarm already processed — skipping")
        fb_put("sb_pending_alarm", None)
        return

    bets = current.get("bets") or {}
    winner, min_diff = None, float("inf")
    for uid, bet in bets.items():
        diff = abs((bet.get("ts") or 0) - alarm_ts)
        if diff < min_diff:
            min_diff, winner = diff, uid

    now = int(time.time() * 1000)
    done_round = {**current, "open": False, "alarmAt": alarm_ts, "winnerId": winner, "completedAt": now}
    all_rounds = fb_get("sb_rounds") or []
    if isinstance(all_rounds, dict):
        all_rounds = list(all_rounds.values())
    all_rounds.append(done_round)

    if winner:
        current_wins = fb_get(f"sb_users/{winner}/totalWins") or 0
        fb_patch(f"sb_users/{winner}", {"totalWins": current_wins + 1})

    new_round = {
        "id": f"r{now}", "createdAt": now, "open": True, "bets": {},
        "openedAfterAlarm": True, "bettingDeadline": now + 3600000
    }

    fb_put("sb_rounds", all_rounds)
    fb_put("sb_current", new_round)
    fb_put("sb_last_alarm", alarm_ts)
    fb_put("sb_pending_alarm", None)

    if winner and winner in bets:
        fb_put("sb_last_winner", {
            "uid": winner, "alarmAt": alarm_ts,
            "betTs": bets[winner].get("ts"), "processedAt": now
        })

    winner_name = (fb_get(f"sb_users/{winner}/displayName") or winner) if winner else "—"
    print(f"✅ Done! Winner: {winner_name} (±{round(min_diff/1000)}s). New round: r{now}")


def main():
    print(f"🔍 Polling oref.org.il every 2s — watching for alarms in {OREF_CITY}")
    print("   Press Ctrl+C to stop.\n")
    last_alarm_id = None
    test_done = bool(fb_get("sb_test_alert"))

    while True:
        try:
            r = requests.get(OREF_URL, headers=HEADERS, timeout=5)
            if r.status_code == 200:
                text = r.content.decode("utf-8").lstrip("\ufeff").strip()
                if text and text not in ("", "null", "[]"):
                    obj = r.json()
                    areas = obj.get("data", []) if isinstance(obj, dict) else []
                    alert_id = obj.get("id", "")

                    # One-time test: save first alert of any type
                    if areas and not test_done:
                        fb_put("sb_test_alert", {
                            "ts": int(time.time() * 1000),
                            "areas": areas,
                            "title": obj.get("title", ""),
                            "id": alert_id,
                        })
                        test_done = True
                        print(f"🧪 Test alert saved: {obj.get('title','')} — {areas}")

                    if OREF_CITY in areas and alert_id != last_alarm_id:
                        alarm_ts = int(time.time() * 1000)
                        print(f"🚨 ALARM in {OREF_CITY}! id={alert_id}")
                        last_alarm_id = alert_id
                        fb_put("sb_pending_alarm", {"ts": alarm_ts, "area": OREF_CITY})
                        process_alarm(alarm_ts)
            else:
                print(f"oref HTTP {r.status_code}")
        except Exception as e:
            print(f"fetch error: {e}")

        time.sleep(2)


if __name__ == "__main__":
    main()
