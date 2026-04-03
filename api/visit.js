let visits = 0;

module.exports = function handler(req, res) {
  if (req.method === 'POST') {
    visits += 1;
    return res.json({ success: true, visits });
  }
  res.status(405).json({ error: 'Method not allowed' });
};
