const { createClient } = require('redis');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    let redis;
    try {
      redis = await createClient({ url: process.env.REDIS_URL }).connect();
      
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'fallback_secret_key';
      
      // 1. Check if token is already a valid JWT (Session check attempt)
      // Do this BEFORE rate limiting, so valid sessions don't get locked out.
      if (token) {
        try {
          const decoded = jwt.verify(token, jwtSecret);
          if (decoded.admin) {
             await redis.disconnect();
             return res.json({ success: true, token: token }); // Return same token
          }
        } catch (err) {
           // Invalid JWT, proceed to password check and rate limiting
        }
      }

      // Rate Limiting for login attempts
      const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const rateLimitKey = `rate_limit:${ip}`;
      const attempts = await redis.incr(rateLimitKey);
      
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 15 * 60); // 15 minutes window
      }

      if (attempts > 5) {
        await redis.disconnect();
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      }
      
      // 2. Check if token is the raw password (Login attempt)
      if (token === process.env.ADMIN_PASSWORD) {
        await redis.del(rateLimitKey); // Clear rate limit on success
        
        // Issue JWT
        const sessionToken = jwt.sign({ admin: true }, jwtSecret, { expiresIn: '12h' });
        
        await redis.disconnect();
        return res.json({ success: true, token: sessionToken });
      }

      await redis.disconnect();
      return res.status(401).json({ error: 'Unauthorized' });
    } catch (error) {
      console.error('Auth error:', error);
      if (redis) {
        try { await redis.disconnect(); } catch (e) {}
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};
