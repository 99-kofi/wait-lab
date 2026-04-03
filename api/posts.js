// In-memory posts store (resets on cold start — use a database for persistence)
let posts = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json(posts);
  }

  if (req.method === 'POST') {
    const { title, content, author, date } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
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
    return res.json(newPost);
  }

  if (req.method === 'DELETE') {
    // Extract id from query string for /api/posts?id=123
    const id = parseInt(req.query.id);
    if (id) {
      posts = posts.filter(p => p.id !== id);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Post id required' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
