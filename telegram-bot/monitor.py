"""
Telegram Red Alert Monitor
Monitors a Telegram channel for alarms in גבעתיים and writes to Firebase.
Deploy to Railway.app — runs 24/7 in the cloud.
"""

import asyncio
import os
import time
import requests
from telethon import TelegramClient, events
from telethon.sessions import StringSession

API_ID       = int(os.environ["TELEGRAM_API_ID"])
API_HASH     = os.environ["TELEGRAM_API_HASH"]
SESSION      = os.environ["TELEGRAM_SESSION"]
CHANNEL      = os.environ.get("TELEGRAM_CHANNEL", "tzeva_adom_israel")
OREF_CITY    = "גבעתיים"
FIREBASE_URL = "https://shelter-bet-default-rtdb.firebaseio.com"
SECRET       = os.environ["FIREBASE_DB_SECRET"]


def fb_get(path):
    try:
        r = requests.get(f"{FIREBASE_URL}/{path}.json?auth={SECRET}", timeout=10)
        return r.json()
    except Exception as e:
        print(f"Firebase GET error: {e}")
        return None


def fb_put(path, data):
    try:
        requests.put(f"{FIREBASE_URL}/{path}.json?auth={SECRET}", json=data, timeout=10)
    except Exception as e:
        print(f"Firebase PUT error: {e}")


def fb_patch(path, data):
    try:
        requests.patch(f"{FIREBASE_URL}/{path}.json?auth={SECRET}", json=data, timeout=10)
    except Exception as e:
        print(f"Firebase PATCH error: {e}")


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
    done_round = {**current, "open": False, "alarmAt": alarm_ts,
                  "winnerId": winner, "completedAt": now}
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

    fb_put("sb_rounds",        all_rounds)
    fb_put("sb_current",       new_round)
    fb_put("sb_last_alarm",    alarm_ts)
    fb_put("sb_pending_alarm", None)

    if winner and winner in bets:
        fb_put("sb_last_winner", {
            "uid": winner, "alarmAt": alarm_ts,
            "betTs": bets[winner].get("ts"), "processedAt": now
        })

    winner_name = (fb_get(f"sb_users/{winner}/displayName") or winner) if winner else "—"
    print(f"✅ Done! Winner: {winner_name} (±{round(min_diff / 1000)}s). New round: r{now}")


client = TelegramClient(StringSession(SESSION), API_ID, API_HASH)


@client.on(events.NewMessage(chats=CHANNEL))
async def handler(event):
    text = event.message.text or ""
    print(f"📨 [{CHANNEL}] {text[:120]}")

    if OREF_CITY in text:
        alarm_ts = int(time.time() * 1000)
        print(f"🚨 ALARM in {OREF_CITY}! ts={alarm_ts}")
        fb_put("sb_pending_alarm", {"ts": alarm_ts, "area": OREF_CITY})

        # One-time test alert
        if not fb_get("sb_test_alert"):
            fb_put("sb_test_alert", {
                "ts": alarm_ts,
                "areas": [OREF_CITY],
                "title": text.split("\n")[0],
                "id": str(event.id),
            })

        process_alarm(alarm_ts)


async def main():
    await client.start()
    print(f"✅ Connected. Monitoring @{CHANNEL} for '{OREF_CITY}'...")
    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
