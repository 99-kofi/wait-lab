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

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function decodeEntities(value = '') {
    return String(value)
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'");
}

function stripHtml(value = '') {
    return decodeEntities(
        String(value)
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|br)>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
    )
        .replace(/\s+/g, ' ')
        .trim();
}

function excerptFromContent(content, maxLength = 160) {
    const text = stripHtml(content);
    if (!text) return 'Latest updates from WAIT LAB.';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function getBaseUrl(req) {
    return `${req.protocol}://${req.get('host')}`;
}

function getPostById(id) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    return data.posts.find(post => post.id === id);
}

function renderSharePage(req, post) {
    const baseUrl = getBaseUrl(req);
    const shareUrl = `${baseUrl}/updates?post=${post.id}`;
    const title = `${post.title} | WAIT LAB`;
    const description = excerptFromContent(post.content);
    const image = post.media ? new URL(post.media, baseUrl).toString() : `${baseUrl}/lab_logo.png`;
        const date = post.date ? new Date(post.date).toISOString() : new Date().toISOString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="WAIT LAB">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(post.title)}">
    <meta property="article:published_time" content="${escapeHtml(date)}">
    <meta property="article:section" content="Updates">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${escapeHtml(image)}">
    <meta property="twitter:url" content="${escapeHtml(shareUrl)}">
    <style>
        body { font-family: Arial, sans-serif; background: #0a0a0a; color: #f5f5f5; margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem; }
        .card { max-width: 640px; width: 100%; background: #121212; border: 1px solid #262626; border-radius: 16px; padding: 2rem; }
        h1 { margin-top: 0; }
        p { color: #a0a0a0; line-height: 1.7; }
        a { color: #5c6bc0; text-decoration: none; }
        .actions { margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; }
        .button { display: inline-block; padding: 0.75rem 1rem; border-radius: 8px; background: #5c6bc0; color: #fff; }
        .button.secondary { background: transparent; border: 1px solid #262626; color: #f5f5f5; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="actions">
            <a class="button" href="${escapeHtml(shareUrl)}">Open update</a>
            <a class="button secondary" href="/updates">Browse updates</a>
        </div>
    </div>
</body>
</html>`;
}

// Clean URLs
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/updates', (req, res) => res.sendFile(path.join(__dirname, 'updates.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/share', (req, res) => {
    const postId = req.query.id ? parseInt(req.query.id, 10) : null;

    if (!postId) {
        return res.status(400).send('Post id required');
    }

    try {
        const post = getPostById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        res.send(renderSharePage(req, post));
    } catch (err) {
        console.error('Error rendering share page:', err);
        res.status(500).send('Failed to render share page');
    }
});
app.get('/api/share', (req, res) => {
    const postId = req.query.id ? parseInt(req.query.id, 10) : null;

    if (!postId) {
        return res.status(400).send('Post id required');
    }

    try {
        const post = getPostById(postId);
        if (!post) {
            return res.status(404).send('Post not found');
        }

        res.send(renderSharePage(req, post));
    } catch (err) {
        console.error('Error rendering share page:', err);
        res.status(500).send('Failed to render share page');
    }
});


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
