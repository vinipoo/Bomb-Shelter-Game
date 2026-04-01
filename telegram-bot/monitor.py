"""
Telegram Red Alert Monitor
Monitors a Telegram channel for alarms in גבעתיים and writes to Firebase.
Deploy to Railway.app — runs 24/7 in the cloud.

Triggers:
  ALARM:         message contains "גבעתיים" AND "ירי רקטות וטילים"
                 → close round, pick winner, show popup
  END OF EVENT:  message contains "סיום אירוע" AND "הודעה מפיקוד העורף" AND "דן"
                 → open new round for next alarm
  ANYTHING ELSE: ignored
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
CHANNEL      = os.environ.get("TELEGRAM_CHANNEL", "red_color")
FIREBASE_URL = "https://shelter-bet-default-rtdb.firebaseio.com"
SECRET       = os.environ["FIREBASE_DB_SECRET"]

ALARM_WORDS     = ["גבעתיים", "ירי רקטות וטילים"]
END_EVENT_WORDS = ["סיום אירוע", "הודעה מפיקוד העורף", "דן"]


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


def close_round(alarm_ts):
    """Close current round and announce winner. Does NOT open a new round."""
    current = fb_get("sb_current")
    if not current:
        print("No current round — skipping")
        fb_put("sb_last_alarm", alarm_ts)
        return
    if not current.get("open"):
        print("Round already closed — skipping")
        return
    if alarm_ts <= current.get("createdAt", 0):
        print("Alarm older than round — skipping")
        return
    last_alarm = fb_get("sb_last_alarm") or 0
    if alarm_ts == last_alarm:
        print("Alarm already processed — skipping")
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

    # Write closed round — do NOT open a new one yet
    fb_put("sb_rounds",     all_rounds)
    fb_put("sb_current",    done_round)
    fb_put("sb_last_alarm", alarm_ts)

    if winner and winner in bets:
        fb_put("sb_last_winner", {
            "uid": winner, "alarmAt": alarm_ts,
            "betTs": bets[winner].get("ts"), "processedAt": now
        })

    winner_name = (fb_get(f"sb_users/{winner}/displayName") or winner) if winner else "—"
    print(f"🏆 Round closed! Winner: {winner_name} (±{round(min_diff / 1000)}s)")


def open_new_round():
    """Open a new betting round after event ends."""
    current = fb_get("sb_current")
    if current and current.get("open"):
        print("Round already open — skipping")
        return

    now = int(time.time() * 1000)
    new_round = {
        "id": f"r{now}", "createdAt": now, "open": True, "bets": {},
        "openedAfterAlarm": True, "bettingDeadline": now + 3600000
    }
    fb_put("sb_current", new_round)
    print(f"✅ New round opened: r{now}")


client = TelegramClient(StringSession(SESSION), API_ID, API_HASH)


@client.on(events.NewMessage(chats=CHANNEL))
async def handler(event):
    text = event.message.text or ""
    print(f"📨 [{CHANNEL}] {text[:120]}")

    # One-time integration test: save first message to Firebase
    if not fb_get("sb_telegram_test"):
        fb_put("sb_telegram_test", {
            "ts":        int(time.time() * 1000),
            "text":      text[:500],
            "messageId": event.id,
            "channel":   CHANNEL,
        })
        print("🧪 Integration test saved to sb_telegram_test")

    # ALARM: גבעתיים + ירי רקטות וטילים
    if all(w in text for w in ALARM_WORDS):
        alarm_ts = int(time.time() * 1000)
        print(f"🚨 ALARM detected! ts={alarm_ts}")
        close_round(alarm_ts)

    # END OF EVENT: סיום אירוע + הודעה מפיקוד העורף + דן
    elif all(w in text for w in END_EVENT_WORDS):
        print("🔔 End of event detected — opening new round")
        open_new_round()

    else:
        print("↩️ Ignored (no relevant trigger)")


async def main():
    while True:
        try:
            await client.connect()
            if not await client.is_user_authorized():
                print("❌ Session not authorized — cannot reconnect")
                break
            print(f"✅ Connected. Monitoring @{CHANNEL}...")
            print(f"   Alarm trigger:     {' + '.join(ALARM_WORDS)}")
            print(f"   End event trigger: {' + '.join(END_EVENT_WORDS)}")
            fb_put("sb_bot_heartbeat", {"ts": int(time.time() * 1000), "status": "connected"})
            await client.run_until_disconnected()
            print("⚠️ Disconnected — reconnecting in 10s...")
        except Exception as e:
            print(f"❌ Error: {e} — reconnecting in 10s...")
        fb_put("sb_bot_heartbeat", {"ts": int(time.time() * 1000), "status": "reconnecting"})
        await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(main())
