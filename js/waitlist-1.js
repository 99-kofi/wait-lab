
  /*
   * WAITLIST BACKEND — Formspree:
   * 1. Create a free form at https://formspree.io (use your page URL as the form's site).
   * 2. Copy the form ID (8 characters, e.g. "xkdoqwer") from your Formspree dashboard.
   * 3. Replace YOUR_FORM_ID below. Done — signups land in your Formspree inbox.
   */
  const WAITLIST_FORM_ID = 'xjygnlyy';
  const WAITLIST_ENDPOINT = 'https://formspree.io/f/' + WAITLIST_FORM_ID;

  const form = document.getElementById('waitlist-form');
  const message = document.getElementById('form-message');
  const emailInput = document.getElementById('email');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;

  function showMessage(text, isError) {
    message.textContent = text;
    message.className = isError ? 'message error' : 'message';
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'SENDING…' : originalLabel;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!emailInput.checkValidity() || !email) {
      showMessage('Enter a valid email address to continue.', true);
      emailInput.focus();
      return;
    }
    if (WAITLIST_FORM_ID === 'YOUR_FORM_ID') {
      showMessage('Waitlist is not connected yet. Replace YOUR_FORM_ID in caspian-waitlist.html.', true);
      return;
    }

    const honeypot = form.querySelector('input[name="_gotcha"]');

    let lastJoin = 0;
    try { lastJoin = parseInt(localStorage.getItem('last_join') || '0', 10) || 0; } catch (e) {}
    if (Date.now() - lastJoin < 15000) {
      showMessage('Hold on a second before trying again.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email,
          _subject: 'CASPIAN waitlist signup',
          _gotcha: honeypot ? honeypot.value : ''
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const joined = email;
        form.reset();
        // release the input's compositor layer so it repaints fresh after reset
        // (avoid mobile ghost-strip artifacts over the placeholder right after send)
        emailInput.blur();
        try { localStorage.setItem('last_join', String(Date.now())); } catch (e) {}
        showMessage('You’re on the list. We’ll signal ' + joined + ' when CASPIAN is ready.');
      } else if (response.status === 400 && data.errors) {
        showMessage('That email was rejected as invalid. Please check it and try again.', true);
      } else {
        showMessage('Could not register right now. Please try again in a moment.', true);
      }
    } catch (error) {
      showMessage('Network error — check your connection and try again.', true);
    } finally {
      setBusy(false);
    }
  });
