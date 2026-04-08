const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = parseInt(req.query.id);
  if (!id) {
    // If no ID is provided, just redirect to the main updates page
    res.setHeader('Location', '/updates');
    return res.status(302).end();
  }

  const redis = await createClient({ url: process.env.REDIS_URL }).connect();
  
  try {
    const data = await redis.get('wait-labs-posts');
    const posts = data ? JSON.parse(data) : [];
    const post = posts.find(p => p.id === id);

    await redis.disconnect();

    if (!post) {
      res.setHeader('Location', '/updates');
      return res.status(302).end();
    }

    // Determine the base URL dynamically based on the request host (for Vercel).
    // Fallback to https://waitlab.space if host header is missing.
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'waitlab.space';
    const baseUrl = `${protocol}://${host}`;

    const title = post.title.replace(/"/g, '&quot;');
    const description = post.content.substring(0, 150).replace(/"/g, '&quot;') + '...';
    
    // If post has media, point to our image pipeline!
    const imageUrl = post.media ? `${baseUrl}/api/image?id=${post.id}` : `${baseUrl}/lab_logo.png`;
    const postUrl = `${baseUrl}/api/share?id=${post.id}`;
    const redirectUrl = `${baseUrl}/updates?post=${post.id}`;

    // Return the HTML skeleton
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} | WAIT LAB</title>
          
          <!-- Primary Meta Tags -->
          <meta name="title" content="${title}">
          <meta name="description" content="${description}">

          <!-- Open Graph / Facebook / WhatsApp -->
          <meta property="og:type" content="article">
          <meta property="og:url" content="${postUrl}">
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${imageUrl}">

          <!-- Twitter -->
          <meta property="twitter:card" content="summary_large_image">
          <meta property="twitter:url" content="${postUrl}">
          <meta property="twitter:title" content="${title}">
          <meta property="twitter:description" content="${description}">
          <meta property="twitter:image" content="${imageUrl}">
          
          <!-- Redirect humans immediately -->
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          <script>window.location.replace("${redirectUrl}");</script>
      </head>
      <body style="background: #0a0a0a; color: #fff; font-family: sans-serif; padding: 2rem; text-align: center;">
          <p>Redirecting to update... <a href="${redirectUrl}" style="color: #5c6bc0;">Click here if not redirected.</a></p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Share rendering error', err);
    try { await redis.disconnect(); } catch(e){}
    res.setHeader('Location', '/updates');
    return res.status(302).end();
  }
};
