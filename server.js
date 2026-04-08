const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

// Clean URLs
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/updates', (req, res) => res.sendFile(path.join(__dirname, 'updates.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images and videos are allowed!"));
    }
});

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ visits: 0, posts: [] }, null, 2));
}

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

// Add a new post with media
app.post('/api/posts', (req, res, next) => {
    console.log('--- POST /api/posts ---');
    upload.single('media')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: 'Upload failed', details: err.message });
        } else if (err) {
            console.error('Unknown upload error:', err);
            return res.status(500).json({ error: 'Server error during upload', details: err.message });
        }
        
        const { title, content, author, date } = req.body;
        console.log('Body:', { title, content, author, date });
        console.log('File:', req.file ? req.file.filename : 'none');

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
                media: req.file ? `/uploads/${req.file.filename}` : null,
                mediaType: req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : null
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
});

// Delete a post
app.delete('/api/posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.posts = data.posts.filter(p => p.id !== id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`WAIT LABS Server running at http://localhost:${PORT}`);
});
