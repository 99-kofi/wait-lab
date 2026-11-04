
        lucide.createIcons();

        let cachedPosts = [];

        // Delegated clicks (replaced inline onclick handlers for CSP)
        const listContainerEl = document.getElementById('posts-container');
        if (listContainerEl) {
            listContainerEl.addEventListener('click', (e) => {
                const shareBtn = e.target.closest('[data-share-id]');
                if (shareBtn) {
                    const id = shareBtn.getAttribute('data-share-id');
                    const p = cachedPosts.find(pp => pp.id == id);
                    sharePost(id, p ? p.title : '');
                    return;
                }
                const card = e.target.closest('article.post-card[data-post-id]');
                if (card) window.location.href = '/updates?post=' + encodeURIComponent(card.getAttribute('data-post-id'));
            });
        }

        function loadPosts() {
            fetch('/api/posts')
                .then(res => res.json())
                .then(posts => {
                    cachedPosts = posts;
                    const container = document.getElementById('posts-container');
                    const mainHeader = document.querySelector('header');
                    const urlParams = new URLSearchParams(window.location.search);
                    const targetPostId = urlParams.get('post');

                    if (targetPostId) {
                        if (mainHeader) mainHeader.style.display = 'none';
                        // SINGLE POST VIEW
                        const post = posts.find(p => p.id == targetPostId);
                        if (!post) {
                            container.innerHTML = '<p style="text-align: center;">Post not found. <a href="/updates">Back to updates</a></p>';
                            return;
                        }

                        // Update page title
                        document.title = post.title + " | WAIT LAB";
                        
                        let dateStr = post.date ? new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent Update';

                        container.innerHTML = `
                            <div class="single-post-view">
                                <a href="/updates" class="back-btn">
                                    <i data-lucide="arrow-left" style="width: 18px;"></i>
                                    Back to Updates
                                </a>
                                <span class="post-date">${dateStr}</span>
                                <h1 style="font-size: 3rem; margin-bottom: 2rem;">${DOMPurify.sanitize(post.title)}</h1>
                                
                                ${post.media ? (post.mediaType === 'video' 
                                    ? `<video src="${post.media}" class="post-cover-media" controls></video>` 
                                    : `<img src="${post.media}" class="post-cover-media" alt="${DOMPurify.sanitize(post.title)}">`) : ''}

                                <div class="post-content" style="font-size: 1.25rem; line-height: 1.8; color: var(--text-main);">${DOMPurify.sanitize(post.content)}</div>

                                <div class="post-footer" style="opacity: 1; pointer-events: auto; justify-content: flex-start; margin-top: 4rem;">
                                    <button class="btn-share" data-share-id="${post.id}">
                                        <i data-lucide="share-2" style="width: 16px; height: 16px;"></i> Share this update
                                    </button>
                                </div>
                            </div>
                        `;
                    } else {
                        // LIST VIEW
                        container.innerHTML = posts.map(post => {
                            let dateStr = 'Recent Update';
                            try {
                                if (post.date) {
                                    dateStr = new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                                }
                            } catch (e) { console.error('Date error:', e); }

                            return `
                                <article class="post-card" id="post-${post.id}" data-post-id="${post.id}">
                                    <span class="post-date">${dateStr}</span>
                                    <h2 class="post-title" style="font-size: 1.75rem; margin-bottom: 1rem;">${DOMPurify.sanitize(post.title)}</h2>
                                    
                                    ${post.media ? (post.mediaType === 'video' 
                                        ? `<div style="position: relative;"><video src="${post.media}" class="post-preview-media"></video><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.5); border-radius: 50%; padding: 10px;"><i data-lucide="play" style="color: white; width: 24px; height: 24px;"></i></div></div>` 
                                        : `<img src="${post.media}" class="post-preview-media" alt="${DOMPurify.sanitize(post.title)}">`) : ''}

                                    <div class="post-content-wrapper" style="max-height: 80px;">
                                        <div class="post-content" style="font-size: 1rem;">${DOMPurify.sanitize(post.content)}</div>
                                    </div>

                                    <div class="read-more-btn">
                                        <span>Read More</span>
                                        <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
                                    </div>
                                </article>
                            `;
                        }).join('');
                    }

                    lucide.createIcons();
                })
                .catch(err => {
                    console.error('Failed to load posts:', err);
                    document.getElementById('posts-container').innerHTML = '<p style="color: #ef5350;">Failed to load updates. Please try again later.</p>';
                });
        }

        function togglePost(id) {
            const card = document.getElementById('post-' + id);
            if (card) {
                card.classList.toggle('expanded');
                // Re-init icons if needed (though they should persist)
                lucide.createIcons();
            }
        }

        function sharePost(id, title) {
            const shareUrl = window.location.origin + '/api/share?id=' + id;
            
            if (navigator.share) {
                // If browser supports native sharing (mobile, Safari, etc)
                navigator.share({
                    title: 'WAIT LAB | ' + title,
                    text: 'Check out this update from WAIT LAB: ' + title,
                    url: shareUrl
                }).catch(err => console.log('Share prompt dismissed', err));
            } else {
                // Fallback to copying to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Share link copied to clipboard!');
                }).catch(err => {
                    prompt('Copy this link to share:', shareUrl);
                });
            }
        }

        loadPosts();
    