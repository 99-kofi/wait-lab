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
  if (req.method === 'POST') {
    const kv = await getClient();
    const visits = await kv.incr('wait-labs-visits');
    return res.json({ success: true, visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
