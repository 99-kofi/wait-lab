const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// Clean URLs
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/updates', (req, res) => res.sendFile(path.join(__dirname, 'updates.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));


// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ visits: 0, posts: [] }, null, 2));
}

// Local authentication endpoint for testing
app.post('/api/auth', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    // Local testing password is 'admin'
    if (token === 'admin' || token === 'local_test_token') {
        res.json({ success: true, token: 'local_test_token' });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// Get site stats
app.get('/api/stats', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({ visits: data.visits });
});

// Log a visit
app.post('/api/visit', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.visits += 1;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, visits: data.visits });
});

// Get all posts
app.get('/api/posts', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        res.json(data.posts);
    } catch (err) {
        console.error('Error reading posts:', err);
        res.status(500).json({ error: 'Failed to read posts' });
    }
});

// Add a new post
app.post('/api/posts', (req, res) => {
    console.log('--- POST /api/posts ---');
    const { title, content, author, date, media, mediaType } = req.body || {};

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const newPost = {
            id: Date.now(),
            title,
            content,
            author: author || 'Admin',
            date: date || new Date().toISOString(),
            media: media || null,
            mediaType: mediaType || null
        };
        data.posts.unshift(newPost);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Post saved successfully');
        res.json(newPost);
    } catch (err) {
        console.error('Error saving post:', err);
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// Edit a post
app.put('/api/posts', (req, res) => {
    console.log('--- PUT /api/posts ---');
    const { id, title, content, author, date, media, mediaType } = req.body || {};

    if (!id || !title || !content) {
        return res.status(400).json({ error: 'ID, title and content are required' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE));
        const index = data.posts.findIndex(p => p.id === parseInt(id));
        
        if (index !== -1) {
            data.posts[index] = {
                ...data.posts[index],
                title,
                content,
                media: media !== undefined ? media : data.posts[index].media,
                mediaType: mediaType !== undefined ? mediaType : data.posts[index].mediaType
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
            console.log('Post updated successfully');
            res.json(data.posts[index]);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// Delete a post
app.delete('/api/posts', (req, res) => {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ error: 'Post id required' });
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.posts = data.posts.filter(p => p.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`WAIT LABS Server running at http://localhost:${PORT}`);
});
