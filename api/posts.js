const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  const POSTS_KEY = 'wait-labs-posts';
  
  // Initialize connection
  const redis = await createClient({ url: process.env.REDIS_URL }).connect();
  
  // Helper to fetch posts
  const getPosts = async () => {
    const data = await redis.get(POSTS_KEY);
    return data ? JSON.parse(data) : [];
  };

  // Helper to check authentication
  const checkAuth = () => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    return token === process.env.ADMIN_PASSWORD;
  };

  try {
    if (req.method === 'GET') {
      const posts = await getPosts();
      await redis.disconnect();
      return res.json(posts);
    }

    if (req.method === 'POST') {
      if (!checkAuth()) {
        await redis.disconnect();
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, content, author, date, media, mediaType } = req.body || {};
      if (!title || !content) {
        await redis.disconnect();
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      const posts = await getPosts();
      const newPost = {
        id: Date.now(),
        title,
        content,
        author: author || 'Admin',
        date: date || new Date().toISOString(),
        media: media || null,
        mediaType: mediaType || null
      };
      posts.unshift(newPost);
      await redis.set(POSTS_KEY, JSON.stringify(posts));
      
      await redis.disconnect();
      return res.json(newPost);
    }

    if (req.method === 'PUT') {
      if (!checkAuth()) {
        await redis.disconnect();
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id, title, content, author, date, media, mediaType } = req.body || {};
      if (!id || !title || !content) {
        await redis.disconnect();
        return res.status(400).json({ error: 'ID, title and content are required' });
      }
      
      let posts = await getPosts();
      const index = posts.findIndex(p => p.id === parseInt(id));
      
      if (index !== -1) {
        posts[index] = {
          ...posts[index],
          title,
          content,
          media: media !== undefined ? media : posts[index].media,
          mediaType: mediaType !== undefined ? mediaType : posts[index].mediaType
        };
        await redis.set(POSTS_KEY, JSON.stringify(posts));
        await redis.disconnect();
        return res.json(posts[index]);
      }
      
      await redis.disconnect();
      return res.status(404).json({ error: 'Post not found' });
    }

    if (req.method === 'DELETE') {
      if (!checkAuth()) {
        await redis.disconnect();
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = parseInt(req.query.id);
      if (id) {
        let posts = await getPosts();
        posts = posts.filter(p => p.id !== id);
        await redis.set(POSTS_KEY, JSON.stringify(posts));
        await redis.disconnect();
        return res.json({ success: true });
      }
      await redis.disconnect();
      return res.status(400).json({ error: 'Post id required' });
    }

    await redis.disconnect();
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Redis error:', error);
    try { await redis.disconnect(); } catch (e) {}
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
