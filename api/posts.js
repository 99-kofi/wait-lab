const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  const POSTS_KEY = 'wait-labs-posts';
  
  // Helper to fetch posts
  const getPosts = async () => (await kv.get(POSTS_KEY)) || [];

  if (req.method === 'GET') {
    const posts = await getPosts();
    return res.json(posts);
  }

  if (req.method === 'POST') {
    const { title, content, author, date } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const posts = await getPosts();
    const newPost = {
      id: Date.now(),
      title,
      content,
      author: author || 'Admin',
      date: date || new Date().toISOString(),
      media: null,
      mediaType: null
    };
    posts.unshift(newPost);
    await kv.set(POSTS_KEY, posts);
    
    return res.json(newPost);
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);
    if (id) {
      let posts = await getPosts();
      posts = posts.filter(p => p.id !== id);
      await kv.set(POSTS_KEY, posts);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Post id required' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
