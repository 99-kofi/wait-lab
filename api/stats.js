// In-memory visit counter (resets on cold start — use a database for persistence)
let visits = 0;

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({ visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
