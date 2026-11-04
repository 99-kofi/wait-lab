
        let currentPosts = [];

        // Delegated clicks for dynamically rendered post actions (replaced inline onclick for CSP)
        const postsContainerEl = document.getElementById('posts-container');
        if (postsContainerEl) {
            postsContainerEl.addEventListener('click', (e) => {
                const editBtn = e.target.closest('[data-edit-id]');
                if (editBtn) { editPost(Number(editBtn.getAttribute('data-edit-id'))); return; }
                const delBtn = e.target.closest('[data-delete-id]');
                if (delBtn) { deletePost(Number(delBtn.getAttribute('data-delete-id'))); return; }
            });
        }
        let editingPostId = null;

        let quill = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Write your post here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'clean']
                ]
            }
        });

        // --- AUTHENTICATION LOGIC ---
        const authOverlay = document.getElementById('auth-overlay');
        const mainContent = document.getElementById('main-content');
        
        function getAuthToken() {
            return localStorage.getItem('admin_password');
        }

        function logout() {
            localStorage.removeItem('admin_password');
            mainContent.style.display = 'none';
            authOverlay.style.display = 'flex';
            document.getElementById('auth-password').value = '';
        }

        async function checkAuth() {
            const token = getAuthToken();
            if (token) {
                try {
                    const res = await fetch('/api/auth', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Update stored token in case server refreshed it
                        if (data.token) localStorage.setItem('admin_password', data.token);
                        authOverlay.style.display = 'none';
                        mainContent.style.display = 'block';
                        loadDashboard();
                        return;
                    }
                } catch(e) {}
                // Token was invalid/expired, clear it
                localStorage.removeItem('admin_password');
            }
            authOverlay.style.display = 'flex';
        }

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Verifying...';
            
            const pwd = document.getElementById('auth-password').value;
            
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${pwd}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('admin_password', data.token || pwd);
                    authOverlay.style.display = 'none';
                    mainContent.style.display = 'block';
                    loadDashboard();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Access denied: ${errData.error || 'Server error'}`);
                }
            } catch(err) {
                alert('Verification encountered an error.');
            }
            btn.innerText = originalText;
        });

        // Global fetch helper tailored to intercept 401s
        async function fetchWithAuth(url, options = {}) {
            const token = getAuthToken();
            const headers = {
                ...options.headers,
                'Authorization': token ? `Bearer ${token}` : ''
            };
            
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                localStorage.removeItem('admin_password');
                alert('Authentication failed. Password might be incorrect or expired.');
                window.location.reload();
                throw new Error('Unauthorized');
            }
            
            return response;
        }

        checkAuth(); // Initial check

        // Static buttons previously wired via onclick attributes
        document.getElementById('logout-btn').addEventListener('click', logout);
        document.getElementById('test-post-btn').addEventListener('click', publishTestPost);


        // --- DASHBOARD LOGIC ---
        // Load data on page load
        function loadDashboard() {
            // Fetch Stats
            fetch('/api/stats')
                .then(res => res.json())
                .then(data => {
                    document.getElementById('visit-count').innerText = data.visits || 0;
                });

            // Fetch Posts
            fetch('/api/posts')
                .then(res => res.json())
                .then(posts => {
                    currentPosts = posts;
                    document.getElementById('post-count').innerText = posts.length;
                    const container = document.getElementById('posts-container');
                    container.innerHTML = posts.map(post => `
                        <div class="post-item">
                            <div style="display: flex; align-items: center;">
                                ${post.media ? (post.mediaType === 'video' 
                                    ? `<video src="${post.media}" class="post-media-preview"></video>` 
                                    : `<img src="${post.media}" class="post-media-preview">`) : ''}
                                <div class="post-info">
                                    <h3>${DOMPurify.sanitize(post.title)}</h3>
                                    <p>${new Date(post.date).toLocaleString()}</p>
                                </div>
                            </div>
                            <div>
                                <button class="btn btn-secondary" style="background: var(--primary); padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem" data-edit-id="${post.id}">Edit</button>
                                <button class="btn btn-delete" data-delete-id="${post.id}">Delete</button>
                            </div>
                        </div>
                    `).join('');
                });
        }

        // Handle form submission
        document.getElementById('publish-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('title').value;
            const content = quill.root.innerHTML;

            if (content === '<p><br></p>') {
                alert('Content cannot be empty');
                return;
            }

            const mediaFile = document.getElementById('media').files[0];

            let mediaBase64 = null;
            let mediaType = null;

            if (mediaFile) {
                // If it exceeds Vercel limits (~4MB), it might fail, but base64 is necessary for serverless data storage without external blobs.
                mediaBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(mediaFile);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
                mediaType = mediaFile.type.startsWith('video') ? 'video' : 'image';
            }
            const payload = {
                title,
                content,
                media: mediaBase64,
                mediaType
            };

            if (editingPostId) {
                payload.id = editingPostId;
            }

            const method = editingPostId ? 'PUT' : 'POST';

            fetchWithAuth('/api/posts', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.error || 'Unknown error') });
                }
                return res.json();
            })
            .then(() => {
                document.getElementById('publish-form').reset();
                quill.setContents([]);
                if (editingPostId) {
                    editingPostId = null;
                    document.querySelector('#publish-form button[type="submit"]').innerText = 'Publish Post';
                }
                loadDashboard();
                alert(method === 'PUT' ? 'Post updated successfully!' : 'Post published successfully!');
            })
            .catch(err => {
                console.error('Error saving post:', err);
                alert('Failed to save post: ' + err.message);
            });
        });

        // Edit post
        function editPost(id) {
            const post = currentPosts.find(p => p.id === id);
            if (post) {
                editingPostId = post.id;
                document.getElementById('title').value = post.title;
                quill.root.innerHTML = post.content;
                document.querySelector('#publish-form button[type="submit"]').innerText = 'Update Post';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // Delete post
        function deletePost(id) {
            if (confirm('Are you sure you want to delete this post?')) {
                fetchWithAuth('/api/posts?id=' + id, { method: 'DELETE' })
                    .then(() => loadDashboard())
                    .catch(e => alert('Failed to delete post: ' + e));
            }
        }

        // Publish test post
        function publishTestPost() {
            const payload = {
                title: 'System Test Post',
                content: 'This is a test post sent by the system to verify the updates page rendering.'
            };
            
            fetchWithAuth('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.ok ? res.json() : Promise.reject('Failed'))
            .then(() => {
                alert('Test post published!');
                loadDashboard();
            })
            .catch(err => alert('Test post failed: ' + err));
        }

        loadDashboard();
    