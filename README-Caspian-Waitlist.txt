CASPIAN WAITLIST — QUICK START

Files:
- caspian-waitlist.html: self-contained page with the original CASPIAN artwork embedded.
- caspian-hero-optimized.jpg: optimized copy of the artwork (optional; the HTML does not need it).

Preview:
Open caspian-waitlist.html in a modern browser.

Included:
- Responsive desktop/mobile layout
- Ultrasound-style scan sweep, glowing halo, subtle floating artwork, grain texture
- Reduced-motion accessibility support
- Email validation and real signup submission via Formspree (AJAX, no redirect)
- Spam protection via honeypot field, plus disabled button/loading state during submit

Connect your Formspree form (one-time setup, ~2 minutes):
1. Create a free form at https://formspree.io and add https://your-domain/ as its site URL.
2. Copy the 8-character form ID from your Formspree dashboard.
3. (Already done) Set the form ID in WAITLIST_FORM_ID in caspian-waitlist.html (search for "WAITLIST BACKEND").
4. Reload the page and submit — signups arrive in your Formspree inbox (free tier: 50/month).

Important:
The form ID (xjygnlyy) is already configured — signups arrive in your Formspree inbox (free tier: 50/month).


WELCOME / CONFIRMATION EMAIL TO SUBSCRIBERS
The form's "email" field is what Formspree mails the confirmation to.
To send every joiner a customized welcome email automatically:
 1. Go to https://formspree.io and open your dashboard.
 2. Open the form "caspian-waitlist" and go to its Workflow tab
    (or Plugins tab on older accounts).
 3. Click "+ Add New" under Actions -> "Auto Response".
 4. Fill in:
      From name : CASPIAN
      Subject   : You're on the CASPIAN waitlist
      Message   : (example below)
 5. Save. Every future submission now gets that email sent to
    the address the visitor typed in.

Example message:
  Thanks for requesting early access to CASPIAN.

  Your spot is reserved. CASPIAN is a thinker-and-doer
  intelligence layer - no noise, just a clean signal the
  moment it's ready. We'll write to this address first.

  - CASPIAN, by WAIT Technologies

Note: the Auto Response feature requires a Formspree
Professional or Business plan. On the free plan the signup is
still recorded and you can reply manually from the dashboard's
submissions list.
