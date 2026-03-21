"""
Run this ONCE locally to generate your Telegram session string.
Then copy the output and add it as TELEGRAM_SESSION in Railway.

Usage:
  pip install telethon
  python generate_session.py
"""

from telethon.sync import TelegramClient
from telethon.sessions import StringSession

api_id   = int(input("Enter TELEGRAM_API_ID: "))
api_hash = input("Enter TELEGRAM_API_HASH: ")

print("\nA verification code will be sent to your Telegram app.")
print("Enter your phone number (with country code, e.g. +972501234567):\n")

with TelegramClient(StringSession(), api_id, api_hash) as client:
    session_string = client.session.save()

print("\n" + "=" * 60)
print("YOUR SESSION STRING (copy this into Railway as TELEGRAM_SESSION):")
print("=" * 60)
print(session_string)
print("=" * 60)
