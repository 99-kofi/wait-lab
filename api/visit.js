const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const redis = await createClient({ url: process.env.REDIS_URL }).connect();
    
    const visits = await redis.incr('wait-labs-visits');
    
    await redis.disconnect();
    return res.json({ success: true, visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
