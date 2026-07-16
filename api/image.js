const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = parseInt(req.query.id);
  if (!id) {
    return res.status(400).send('Missing post id');
  }

  const redis = await createClient({ url: process.env.REDIS_URL }).connect();
  
  try {
    const data = await redis.get('wait-labs-posts');
    const posts = data ? JSON.parse(data) : [];
    const post = posts.find(p => p.id === id);

    await redis.disconnect();

    if (!post || !post.media) {
      return res.status(404).send('Image not found');
    }

    // post.media is a base64 Data URL: "data:image/png;base64,iVBORw0KGgo..."
    const matches = post.media.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(500).send('Invalid media format');
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Image parsing error', err);
    try { await redis.disconnect(); } catch(e){}
    return res.status(500).send('Server Error');
  }
};
