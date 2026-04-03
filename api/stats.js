const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const visits = (await kv.get('wait-labs-visits')) || 0;
    return res.json({ visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
