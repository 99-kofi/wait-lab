const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const visits = await kv.incr('wait-labs-visits');
    return res.json({ success: true, visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
