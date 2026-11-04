CASPIAN WAITLIST — CURRENT SETUP
================================

FILES
- caspian-waitlist.html  — the page (this folder, plus synced copies in
  C:\Users\PC\Documents\cap\ and in the wait-lab repo as waitlist.html)
- Live URL: https://wait-lab.vercel.app/waitlist
- The repo's index.html links to it from the nav ("Waitlist").

BACKEND — FormSubmit (free, no dashboard needed)
------------------------------------------------
- The form POSTs JSON to:
    https://formsubmit.co/ajax/WAITLIST_INBOX_REDACTED
- ONE-TIME ACTIVATION (required):
  1. Open the live page and join with any real email once.
  2. FormSubmit emails an activation link to WAITLIST_INBOX_REDACTED —
     click it. From then on the endpoint is live.
- On every signup you receive a notification email at
  WAITLIST_INBOX_REDACTED, and the SUBSCRIBER automatically receives a
  welcome email generated from the `_autoresponse` text embedded in
  waitlist.html. Edit that text in waitlist.html (search "_autoresponse")
  to change the welcome message.
- Spam guard: hidden honeypot field in the form; bots are silently skipped.

VISUAL/UX FEATURES
------------------
- Dithered "CASPIAN" intro overlay: animated Bayer-dithered noise that
  resolves into the emblem + wordmark (~4.8s, click to skip, honors
  prefers-reduced-motion). Grid adapts: 5px cells on phones, 7px on desktop.
- Art panel keeps the ultrasound scan line, crosshair-free emblem with the
  blurred logo backdrop, grain and float.
- Form states: SENDING… while submitting, personalized success
  ("We'll signal <email> when CASPIAN is ready."), clear error messages.

TROUBLESHOOTING
---------------
- "Could not register right now" on join = the form reached the endpoint
  but it failed. If it persists, check whether formsubmit.co is up
  (e.g. isitdownrightnow.com) — it had a full outage (HTTP 522) on
  the day this was switched over; such outages are temporary and need
  no code changes.
- If you ever change the notification email, edit the WAITLIST_ENDPOINT
  constant in waitlist.html and the CSP in vercel.json
  (https://formsubmit.co) — both deployed via git push to main
  (Vercel redeploy takes ~30-60s).
