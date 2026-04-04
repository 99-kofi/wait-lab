module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === process.env.ADMIN_PASSWORD) {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
