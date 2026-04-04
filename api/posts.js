const { createClient } = require('redis');
const REDIS_URL = process.env.REDIS_URL;

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: REDIS_URL });
    client.on('error', err => console.log('Redis Client Error', err));
    await client.connect();
  }
  return client;
}

module.exports = async function handler(req, res) {
  const POSTS_KEY = 'wait-labs-posts';
  const kv = await getClient();
  
  // Helper to fetch posts (standard redis requires json.parse)
  const getPosts = async () => {
    const data = await kv.get(POSTS_KEY);
    return data ? JSON.parse(data) : [];
  };

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
    await kv.set(POSTS_KEY, JSON.stringify(posts));
    
    return res.json(newPost);
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id);
    if (id) {
      let posts = await getPosts();
      posts = posts.filter(p => p.id !== id);
      await kv.set(POSTS_KEY, JSON.stringify(posts));
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Post id required' });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
