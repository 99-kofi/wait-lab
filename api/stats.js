const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const redis = await createClient({ url: process.env.REDIS_URL }).connect();
    
    const visits = parseInt(await redis.get('wait-labs-visits')) || 0;
    
    await redis.disconnect();
    return res.json({ visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
