// In-memory visit counter (resets on cold start — use a database for persistence)
let visits = 0;

export default function handler(req, res) {
  if (req.method === 'POST') {
    visits += 1;
    return res.json({ success: true, visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
