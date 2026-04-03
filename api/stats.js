const { createClient } = require('redis');
const REDIS_URL = process.env.REDIS_URL || 'redis://default:HWAvHCedhYFKj51L3d0XWHhyhIl87epj@redis-15067.c93.us-east-1-3.ec2.cloud.redislabs.com:15067';

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
  if (req.method === 'GET') {
    const kv = await getClient();
    const visits = parseInt(await kv.get('wait-labs-visits')) || 0;
    return res.json({ visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
